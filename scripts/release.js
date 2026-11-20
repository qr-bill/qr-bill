// Stages on npm the packages whose version is not there yet, and publishes their GitHub releases once a maintainer
// has approved them on npmjs.com.
//
// The release workflow (.github/workflows/release.yml) runs it on every push to `main`. Most pushes find nothing to do:
// only a release pull request changes the versions in the package.json files. The whole process is described in
// docs/releasing.md.
//
//   node scripts/release.js plan                         the state of each package, changes nothing
//   node scripts/release.js publish --dry-run            the same, plus packing and `npm stage publish --dry-run`
//   node scripts/release.js publish [--wait <minutes>]   stages and releases; refused outside GitHub Actions
//
// npm only makes a staged version public once a maintainer approves it with two-factor authentication: the workflow
// can stage, never publish. The GitHub release, created as a draft when the version is staged, records that it was
// staged and on which commit; publishing the release creates the tag `<name>@<version>` on that commit.
//
// | On npm | GitHub release      | State      | What `publish` does                                                    |
// | ------ | ------------------- | ---------- | ---------------------------------------------------------------------- |
// | no     | none                | new        | packs, stages on npm, creates the draft release with the changelog     |
// | no     | draft               | staged     | nothing: waits for the approval on npmjs.com                           |
// | yes    | draft               | approved   | publishes the release, which creates the tag                           |
// | yes    | none, but tagged    | tagged     | creates the release on the tag (a version published by hand, as 0.1.0) |
// | yes    | published           | released   | nothing                                                                |
//
// With `--wait <minutes>`, it then checks npm every 20 seconds and publishes the release of each version as soon as it
// is approved. Running it again after a failure only does what is missing.
import console from 'node:console';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const root = join(import.meta.dirname, '..');
const [command, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry-run');
const waitIndex = flags.indexOf('--wait');
const waitMinutes = waitIndex === -1 ? 0 : Number(flags[waitIndex + 1]);
const { GITHUB_ACTIONS, GITHUB_SHA, GITHUB_OUTPUT } = process.env;

/** Runs a command and returns what it prints. */
function run(file, args, options = {}) {
  return execFileSync(file, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim();
}

/** Runs pnpm: the one that started this script (`pnpm release:plan`), otherwise the one on the PATH. */
function pnpm(args, options) {
  const execPath = process.env.npm_execpath;
  if (execPath?.includes('pnpm') && /\.c?js$/.test(execPath)) {
    return run(process.execPath, [execPath, ...args], options);
  }
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

/** Whether this version of the package is public on npm. A package that does not exist yet answers E404. */
function isOnNpm(name, version) {
  try {
    return run('npm', ['view', `${name}@${version}`, 'version']) === version;
  } catch (error) {
    if (String(error.stderr).includes('E404')) return false;
    throw error;
  }
}

/** The GitHub repository, `qr-bill/qr-bill`: given by the workflow, or read from the package.json of the core. */
const repository =
  process.env.GITHUB_REPOSITORY ??
  /github\.com\/([^/]+\/[^/.]+)/.exec(
    JSON.parse(readFileSync(join(root, 'packages', 'core', 'package.json'), 'utf8')).repository.url,
  )[1];

/** Calls the GitHub API of the repository with the gh command line; null when the resource does not exist. */
function github(method, path, body) {
  const args = ['api', '-X', method, `repos/${repository}/${path}`];
  if (method === 'GET') args.push('--paginate', '--slurp');
  else args.push('--input', '-');
  try {
    const output = JSON.parse(run('gh', args, { input: body === undefined ? '' : JSON.stringify(body) }));
    // --slurp gathers the pages of a list into an array of pages.
    return method === 'GET' && Array.isArray(output) ? output.flat() : output;
  } catch (error) {
    if (String(error.stderr).includes('HTTP 404')) return null;
    throw error;
  }
}

/**
 * The releases of the repository by tag. Drafts are listed only with a token that can write the repository: the
 * read-only "Plan" job does not see them, the "Publish" job does.
 */
function releasesByTag() {
  return new Map((github('GET', 'releases') ?? []).map((release) => [release.tag_name, release]));
}

/** The notes of a version: its section in the CHANGELOG.md of the package. */
function releaseNotes(pkg) {
  const changelog = readFileSync(join(pkg.dir, 'CHANGELOG.md'), 'utf8');
  const section = changelog.split(`\n## ${pkg.manifest.version}\n`)[1];
  if (section === undefined) {
    throw new Error(`${pkg.manifest.name}: no section ${pkg.manifest.version} in CHANGELOG.md`);
  }
  return section.split('\n## ')[0].trim();
}

/** The state of each package, as in the table at the top of this file. */
function readStates() {
  const releases = releasesByTag();
  return workspacePackages().map((pkg) => {
    const { name, version } = pkg.manifest;
    const tag = `${name}@${version}`;
    const release = releases.get(tag);
    const onNpm = isOnNpm(name, version);
    let state;
    if (!onNpm) state = release?.draft ? 'staged' : 'new';
    else if (release?.draft) state = 'approved';
    else if (release) state = 'released';
    else if (github('GET', `git/ref/tags/${tag}`) !== null) state = 'tagged';
    // On npm without release nor tag: either the draft of an approved version, invisible to a read-only token, or a
    // version published outside the workflow. The "Publish" job, which sees drafts, tells them apart.
    else state = 'unknown';
    return { pkg, tag, release, state };
  });
}

/** Packs a package with pnpm (which replaces `workspace:^` by the real version) and stages the tarball on npm. */
function stageOnNpm(pkg) {
  const folder = mkdtempSync(join(tmpdir(), 'qr-bill-pack-'));
  pnpm(['pack', '--pack-destination', folder], { cwd: pkg.dir });
  const tarball = join(
    folder,
    readdirSync(folder).find((file) => file.endsWith('.tgz')),
  );
  // A prerelease (0.2.0-next.0) goes to the npm tag `next`, so that `npm install` keeps giving the latest stable version.
  const distTag = pkg.manifest.version.includes('-') ? 'next' : 'latest';
  const args = ['stage', 'publish', tarball, '--access', 'public', '--tag', distTag];
  args.push(...(dryRun ? ['--dry-run'] : ['--provenance']));
  console.log(run('npm', args, { stdio: ['ignore', 'pipe', 'inherit'] }));
}

/** Creates the draft release of a staged version, on the commit being built. */
function createDraftRelease(pkg, tag) {
  github('POST', 'releases', {
    tag_name: tag,
    target_commitish: GITHUB_SHA,
    name: tag,
    body: releaseNotes(pkg),
    draft: true,
  });
}

/** Publishes a release; GitHub creates its tag if needed. The core is shown as the latest release of the repository. */
function publishRelease(pkg, release) {
  github('PATCH', `releases/${release.id}`, {
    draft: false,
    make_latest: pkg.manifest.name === '@qr-bill/core' ? 'true' : 'false',
  });
}

const descriptions = {
  new: 'not on npm yet: to stage',
  staged: 'staged on npm, waiting for approval on npmjs.com',
  approved: 'approved on npm: its GitHub release is to publish',
  tagged: 'on npm and tagged: its GitHub release is to create',
  released: 'released, nothing to do',
  unknown: 'on npm, without release nor tag',
};

const states = readStates();
for (const { tag, state } of states) console.log(`${tag}: ${descriptions[state]}`);
const todo = states.filter(({ state }) => ['new', 'approved', 'tagged', 'unknown'].includes(state));
if (GITHUB_OUTPUT) {
  appendFileSync(GITHUB_OUTPUT, `count=${todo.length}\n`);
  appendFileSync(GITHUB_OUTPUT, `stage=${states.filter(({ state }) => state === 'new').length}\n`);
}

if (command === 'plan') process.exit(0);
if (command !== 'publish') {
  console.error('Usage: node scripts/release.js plan | publish [--dry-run] [--wait <minutes>]');
  process.exit(1);
}

const toStage = states.filter(({ state }) => state === 'new');
if (toStage.length > 0) {
  const [major, minor] = run('npm', ['--version']).split('.').map(Number);
  if (major < 11 || (major === 11 && minor < 15)) {
    console.error('npm stage needs npm 11.15.0 or later (Node 24 comes with it).');
    process.exit(1);
  }
}
if (dryRun) {
  for (const { pkg } of toStage) stageOnNpm(pkg);
  console.log('Dry run: nothing was staged, tagged or released.');
  process.exit(0);
}
if (GITHUB_ACTIONS !== 'true' || GITHUB_SHA === undefined) {
  console.error('Publication happens only in the release workflow, see docs/releasing.md.');
  process.exit(1);
}

for (const { pkg, tag, release, state } of states) {
  if (state === 'new') {
    stageOnNpm(pkg);
    createDraftRelease(pkg, tag);
    console.log(`${tag}: staged. Approve it on npmjs.com, in the "Staged Packages" tab of the package.`);
  } else if (state === 'approved') {
    publishRelease(pkg, release);
    console.log(`${tag}: GitHub release published.`);
  } else if (state === 'tagged') {
    github('POST', 'releases', {
      tag_name: tag,
      name: tag,
      body: releaseNotes(pkg),
      make_latest: pkg.manifest.name === '@qr-bill/core' ? 'true' : 'false',
    });
    console.log(`${tag}: GitHub release created on the existing tag.`);
  } else if (state === 'unknown') {
    console.log(`::warning::${tag} is on npm without GitHub release nor tag: it was published outside the workflow.`);
  }
}

// Waits for the approvals, and publishes each release as soon as its version is public on npm. Only a run that has
// just staged a version waits: the maintainer is approving it; a version staged earlier is handled by a later run.
const deadline = Date.now() + (toStage.length > 0 ? waitMinutes : 0) * 60_000;
let waiting = readStates().filter(({ state }) => state === 'staged' || state === 'approved');
while (waiting.length > 0) {
  for (const { pkg, tag, release, state } of waiting) {
    if (state === 'approved') {
      publishRelease(pkg, release);
      console.log(`${tag}: approved on npm, GitHub release published.`);
    }
  }
  waiting = waiting.filter(({ state }) => state === 'staged');
  if (waiting.length === 0 || Date.now() >= deadline) break;
  await sleep(20_000);
  waiting = readStates().filter(({ state }) => state === 'staged' || state === 'approved');
}
for (const { tag } of waiting) {
  console.log(
    `::notice title=Waiting for approval::${tag} is staged on npm. Approve it on npmjs.com; its GitHub release will ` +
      'be published by the next run of the Release workflow (next push to main, or "Run workflow" without dry-run).',
  );
}
