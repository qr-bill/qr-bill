// TypeDoc plugin: lets `{@link name}` reach a declaration of another source file.
//
// The documentation has one page per source file (entryPointStrategy "expand"). TypeDoc resolves a link from the
// file where it is written, so `{@link validateQRBill}` in bill/create.ts finds nothing unless the name is imported
// there. This plugin resolves such links by name across the whole project, when exactly one file declares the name,
// just before TypeDoc resolves the remaining links itself.
import { Converter, ReflectionKind } from 'typedoc';

/** @param {import('typedoc').Application} app */
export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    const reflections = Object.values(context.project.reflections);

    /** @type {Map<string, import('typedoc').Reflection[]>} Top-level declarations of each file, by name. */
    const declarations = new Map();
    for (const reflection of reflections) {
      if (reflection.kindOf(ReflectionKind.Reference) || !reflection.parent?.kindOf(ReflectionKind.Module)) continue;
      declarations.set(reflection.name, [...(declarations.get(reflection.name) ?? []), reflection]);
    }

    for (const reflection of reflections) {
      const comment = reflection.comment;
      if (comment === undefined) continue;
      for (const parts of [comment.summary, ...comment.blockTags.map((tag) => tag.content)]) {
        for (const part of parts) {
          // A target is already set when TypeScript itself resolved the name (it is imported in that file).
          if (part.kind !== 'inline-tag' || !part.tag.startsWith('@link') || part.target !== undefined) continue;
          const found = declarations.get(part.text.trim());
          if (found?.length === 1) part.target = found[0];
        }
      }
    }
  });
}
