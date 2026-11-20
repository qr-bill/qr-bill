// Runs the one-line examples of the documentation comments of the invoice, so that they cannot drift from the code.
// An example line looks like `expression; // expected result: optional explanation`, the expression being a call or
// a property, e.g. `validateUID('CHE-123.456.788'); // 'valid'`. It runs with the public API and the exports of its
// own file in scope; its result must equal the literal that starts the comment (a string, an array, a number, a
// bigint, a boolean or undefined).
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as api from '../src/index.js';

const SOURCE = new URL('../src/', import.meta.url);

const EXAMPLE_LINE = /^\s*\* ([A-Za-z][\w.]*(?:\(.*\))?(?:\.\w+)*);\s*\/\/ (.+)$/;
const LEADING_LITERAL = /^('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\[.*?\]|-?\d+n|-?\d+(?:\.\d+)?|true|false|undefined)/;

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

const examples = readdirSync(SOURCE, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.ts'))
  .flatMap((file) => examplesOf(new URL(file, SOURCE)));

function evaluate(code: string, scope: Record<string, unknown>): unknown {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the code comes from our own documentation
  const run = new Function(...Object.keys(scope), `return (${code});`) as (...values: unknown[]) => unknown;
  return run(...Object.values(scope));
}

describe('documentation examples of the invoice', () => {
  it('finds examples in the sources', () => {
    expect(examples.length).toBeGreaterThan(15);
  });

  it.each(examples.map((example) => ({ ...example, where: example.file.pathname.split('/src/')[1] })))(
    '$where: $code → $expected',
    async ({ file, code, expected }) => {
      const module = (await import(file.href)) as Record<string, unknown>;
      expect(evaluate(code, { ...api, ...module })).toEqual(evaluate(expected, {}));
    },
  );
});
