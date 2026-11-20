// Publishes to npm the packages whose version is not there yet, with their tags and GitHub releases.
//
// The release workflow (.github/workflows/release.yml) runs it on every push to `main`. Most pushes publish nothing:
// only a release pull request changes the versions in the package.json files. The whole process is described in
// docs/releasing.md.
//
//   node scripts/release.js plan                 what would be done, without doing anything
//   node scripts/release.js publish --dry-run    the same, plus packing and `npm publish --dry-run`
//   node scripts/release.js publish              publishes; refused outside GitHub Actions
//
// For each package of packages/, dependencies first:
// - its version is not on npm: tag `<name>@<version>` on the commit being built, `pnpm pack` (which replaces
//   `workspace:^` by the real version), `npm publish` of the tarball (Trusted Publishing: no token, provenance added
//   by npm), then a GitHub release whose notes are the section of the version in CHANGELOG.md;
// - its version is on npm, tagged, but without a release (a run that stopped after publishing): the release only;
// - otherwise: nothing.
// Running it again after a failure only does what is missing.
import console from 'node:console';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const root = join(import.meta.dirname, '..');
const [command, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry-run');
const { GITHUB_ACTIONS, GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_OUTPUT } = process.env;

/** Runs a command and returns what it prints. */
function run(file, args, options = {}) {
  return execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

/** Runs pnpm: the one that started this script (`pnpm release:plan`), otherwise the one on the PATH. */
function pnpm(args, options) {
  const execPath = process.env.npm_execpath;
  if (execPath?.includes('pnpm') && /\.c?js$/.test(execPath))
    return run(process.execPath, [execPath, ...args], options);
  return run('pnpm', args, options);
}

/** The public packages of packages/, each one after the workspace packages it depends on. */
function workspacePackages() {
  const all = readdirSync(join(root, 'packages'))
    .map((folder) => join(root, 'packages', folder))
    .filter((dir) => existsSync(join(dir, 'package.json')))
    .map((dir) => ({ dir, manifest: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) }));
  const byName = new Map(all.filter(({ manifest }) => !manifest.private).map((pkg) => [pkg.manifest.name, pkg]));
  const sorted = [];
  const visit = (pkg) => {
    if (sorted.includes(pkg)) return;
    for (const dependency of Object.keys(pkg.manifest.dependencies ?? {})) {
      const workspaceDependency = byName.get(dependency);
      if (workspaceDependency) visit(workspaceDependency);
    }
    sorted.push(pkg);
  };
  for (const pkg of byName.values()) visit(pkg);
  return sorted;
}

/** Whether this version of the package is on npm. A package that does not exist yet answers E404. */
function isOnNpm(name, version) {
  try {
    return run('npm', ['view', `${name}@${version}`, 'version']) === version;
  } catch (error) {
    if (String(error.stderr).includes('E404')) return false;
    throw error;
  }
}

/** Calls the GitHub API with the gh command line (GH_TOKEN in the workflow); null when the resource does not exist. */
function github(path, fields = {}) {
  const args = ['api', `repos/${GITHUB_REPOSITORY}/${path}`];
  for (const [key, value] of Object.entries(fields)) args.push('-f', `${key}=${value}`);
  try {
    return JSON.parse(run('gh', args));
  } catch (error) {
    if (String(error.stderr).includes('HTTP 404')) return null;
    throw error;
  }
}

/** The commit a tag points to, or null when the tag does not exist. */
function taggedCommit(tag) {
  const ref = github(`git/ref/tags/${tag}`);
  if (ref === null) return null;
  return ref.object.type === 'tag' ? github(`git/tags/${ref.object.sha}`).object.sha : ref.object.sha;
}

/** Creates an annotated tag on a commit, as changesets does; the ruleset "release tags" forbids moving it later. */
function createTag(tag, commit) {
  const object = github('git/tags', { tag, message: tag, object: commit, type: 'commit' });
  github('git/refs', { ref: `refs/tags/${tag}`, sha: object.sha });
}

/** The notes of a version: its section in the CHANGELOG.md of the package. */
function releaseNotes(pkg) {
  const changelog = readFileSync(join(pkg.dir, 'CHANGELOG.md'), 'utf8');
  const section = changelog.split(`\n## ${pkg.manifest.version}\n`)[1];
  if (section === undefined)
    throw new Error(`${pkg.manifest.name}: no section ${pkg.manifest.version} in CHANGELOG.md`);
  return section.split('\n## ')[0].trim();
}

/** Creates the GitHub release of an existing tag. The core is shown as the latest release of the repository. */
function createRelease(pkg, tag) {
  const notes = join(mkdtempSync(join(tmpdir(), 'qr-bill-notes-')), 'notes.md');
  writeFileSync(notes, `${releaseNotes(pkg)}\n`);
  const latest = pkg.manifest.name === '@qr-bill/core' ? 'true' : 'false';
  run('gh', ['release', 'create', tag, '--verify-tag', '--title', tag, '--notes-file', notes, `--latest=${latest}`], {
    env: { ...process.env, GH_REPO: GITHUB_REPOSITORY },
  });
}

/** Packs a package with pnpm and publishes the tarball with npm, which supports Trusted Publishing. */
function publishToNpm(pkg) {
  const folder = mkdtempSync(join(tmpdir(), 'qr-bill-pack-'));
  pnpm(['pack', '--pack-destination', folder], { cwd: pkg.dir });
  const tarball = join(
    folder,
    readdirSync(folder).find((file) => file.endsWith('.tgz')),
  );
  // A prerelease (0.2.0-next.0) goes to the npm tag `next`, so that `npm install` keeps giving the latest stable version.
  const distTag = pkg.manifest.version.includes('-') ? 'next' : 'latest';
  const args = ['publish', tarball, '--access', 'public', '--tag', distTag, ...(dryRun ? ['--dry-run'] : [])];
  const output = run('npm', args, {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  console.log(output);
}

// What to do for each package.
const canUseGitHub = GITHUB_REPOSITORY !== undefined;
const plan = workspacePackages().map((pkg) => {
  const { name, version } = pkg.manifest;
  const tag = `${name}@${version}`;
  if (!isOnNpm(name, version)) return { pkg, tag, action: 'publish' };
  if (canUseGitHub && taggedCommit(tag) !== null && github(`releases/tags/${tag}`) === null) {
    return { pkg, tag, action: 'release' };
  }
  return { pkg, tag, action: 'none' };
});
const todo = plan.filter(({ action }) => action !== 'none');

for (const { tag, action } of plan) {
  console.log(
    `${tag}: ${{ publish: 'to publish', release: 'on npm, GitHub release missing', none: 'nothing to do' }[action]}`,
  );
}
if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `count=${todo.length}\n`);

if (command === 'plan') process.exit(0);
if (command !== 'publish') {
  console.error('Usage: node scripts/release.js plan | publish [--dry-run]');
  process.exit(1);
}
if (todo.length === 0) {
  console.log('Nothing to publish.');
  process.exit(0);
}
if (dryRun) {
  for (const { pkg, action } of todo) if (action === 'publish') publishToNpm(pkg);
  console.log('Dry run: nothing was published, tagged or released.');
  process.exit(0);
}
if (GITHUB_ACTIONS !== 'true' || GITHUB_SHA === undefined) {
  console.error('Publication happens only in the release workflow, see docs/releasing.md.');
  process.exit(1);
}

for (const { pkg, tag, action } of todo) {
  if (action === 'publish') {
    // The tag first: if npm fails, running the workflow again finds the tag on the same commit and goes on.
    const commit = taggedCommit(tag);
    if (commit === null) createTag(tag, GITHUB_SHA);
    else if (commit !== GITHUB_SHA) throw new Error(`${tag} already points to ${commit}, not to ${GITHUB_SHA}`);
    publishToNpm(pkg);
  }
  createRelease(pkg, tag);
  console.log(`${tag}: published, tagged and released.`);
}
