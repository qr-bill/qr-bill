// Runs the one-line examples of the documentation, so that it cannot drift from the code: the documentation comments
// of the sources and the code blocks of the READMEs. An example line looks like
// `functionName(arguments); // expected result: optional explanation`. It runs with the public API in scope, plus the
// exports of its own file for a source file; its result must equal the literal that starts the comment.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as api from '../src/index.js';

const SOURCE = new URL('../src/', import.meta.url);
const READMES = [new URL('../README.md', import.meta.url), new URL('../../../README.md', import.meta.url)];

const EXAMPLE_LINE = /^\s*(?:\* )?([A-Za-z]\w*\(.*\));\s*\/\/ (.+)$/;
const LEADING_LITERAL = /^('(?:[^'\\]|\\.)*'|\[.*?\]|-?\d+(?:\.\d+)?|true|false|undefined)/;

interface Example {
  readonly file: URL;
  readonly code: string;
  readonly expected: string;
}

function examplesOf(file: URL): Example[] {
  const examples: Example[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = EXAMPLE_LINE.exec(line);
    const literal = match?.[2] === undefined ? null : LEADING_LITERAL.exec(match[2]);
    if (match?.[1] !== undefined && literal?.[1] !== undefined) {
      examples.push({ file, code: match[1], expected: literal[1] });
    }
  }
  return examples;
}

const sources = readdirSync(SOURCE, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.ts'))
  .map((file) => new URL(file, SOURCE));
const examples = [...sources, ...READMES].flatMap(examplesOf);

function evaluate(code: string, scope: Record<string, unknown>): unknown {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the code comes from our own documentation
  const run = new Function(...Object.keys(scope), `return (${code});`) as (...values: unknown[]) => unknown;
  return run(...Object.values(scope));
}

const ROOT = new URL('../../../', import.meta.url);

/** Path of a file from the root of the repository. */
function label(file: URL): string {
  return file.pathname.slice(ROOT.pathname.length);
}

describe('documentation examples', () => {
  it('finds examples in the sources and in both READMEs', () => {
    expect(examples.length).toBeGreaterThan(50);
    for (const readme of READMES) {
      expect(examples.some((example) => example.file === readme)).toBe(true);
    }
  });

  it.each(examples.map((example) => ({ ...example, where: label(example.file) })))(
    '$where: $code → $expected',
    async ({ file, code, expected }) => {
      const module = file.pathname.endsWith('.ts') ? ((await import(file.href)) as Record<string, unknown>) : {};
      expect(evaluate(code, { ...api, ...module })).toEqual(evaluate(expected, {}));
    },
  );
});
