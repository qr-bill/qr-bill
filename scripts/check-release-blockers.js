// Blocks the publication to npm while a README still says that the project is not released.
//
// Runs as the `prepublishOnly` script of every package, and before every release, so a publication stops with the list
// of lines to remove. Mark such text with the HTML comment `<!-- release-blocker -->` (invisible on GitHub and npm);
// the words "not published yet" are caught even without it.
import console from 'node:console';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const root = join(import.meta.dirname, '..');
// A private package is never published: its README may say that it is not released yet.
const isPrivate = (name) => {
  const manifest = join(root, 'packages', name, 'package.json');
  return existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).private === true;
};
const readmes = [
  join(root, 'README.md'),
  ...readdirSync(join(root, 'packages'))
    .filter((name) => !isPrivate(name))
    .map((name) => join(root, 'packages', name, 'README.md')),
].filter((file) => existsSync(file));

const blockers = readmes.flatMap((file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) =>
      /release-blocker|not published yet/i.test(line) ? [`${relative(root, file)}:${index + 1}: ${line.trim()}`] : [],
    ),
);

if (blockers.length > 0) {
  console.error('Publication blocked. Remove these lines before publishing to npm:\n');
  for (const blocker of blockers) console.error(`  ${blocker}`);
  process.exit(1);
}
console.log(`No release blocker in ${readmes.length} README files.`);
