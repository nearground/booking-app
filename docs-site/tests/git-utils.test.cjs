const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { githubRemoteUrl, parseCommitLog } = require('../git-utils.cjs');

test('parses commit identity, subject and exact Work-Item trailers', () => {
  const sha = 'a'.repeat(40);
  const result = parseCommitLog([
    `${sha}\x1f${sha.slice(0, 7)}\x1f2026-10-26T12:00:00-07:00\x1fAdd attendee list\x1fEPIC-tools/STORY-001/TASK-001,EPIC-tools/STORY-002/TASK-003`,
  ].join('\n'));
  assert.equal(result.length, 1);
  assert.equal(result[0].sha, sha);
  assert.deepEqual(result[0].workItems, [
    'EPIC-tools/STORY-001/TASK-001',
    'EPIC-tools/STORY-002/TASK-003',
  ]);
});

test('does not infer task association from commit subjects', () => {
  const result = parseCommitLog(
    `${'b'.repeat(40)}\x1fbbbbbbb\x1f2026-10-26T12:00:00Z\x1fTASK-001 is in this subject\x1f`
  );
  assert.deepEqual(result[0].workItems, []);
});

test('normalizes HTTPS and SSH GitHub remotes', () => {
  assert.equal(githubRemoteUrl('https://github.com/nearground/react-booking-app.git'), 'https://github.com/nearground/react-booking-app');
  assert.equal(githubRemoteUrl('git@github.com:nearground/react-booking-app.git'), 'https://github.com/nearground/react-booking-app');
});

test('does not turn non-GitHub or empty remotes into fake links', () => {
  assert.equal(githubRemoteUrl(''), null);
  assert.equal(githubRemoteUrl('https://gitlab.com/acme/app.git'), null);
});

test('reads Work-Item trailers from real Git history without inferring unmatched commits', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'work-index-git-'));
  const git = (...args) => execFileSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Planning test',
      GIT_AUTHOR_EMAIL: 'planning-test@example.invalid',
      GIT_COMMITTER_NAME: 'Planning test',
      GIT_COMMITTER_EMAIL: 'planning-test@example.invalid',
    },
  }).trim();

  try {
    git('init', '--quiet');
    git('config', 'core.autocrlf', 'false');
    writeFileSync(path.join(directory, 'tracked.txt'), 'implementation\n');
    git('add', 'tracked.txt');
    git('commit', '--quiet', '-m', 'Implement task acceptance criteria', '-m',
      'Work-Item: EPIC-demo/STORY-001/TASK-001');
    writeFileSync(path.join(directory, 'tracked.txt'), 'follow-up\n');
    git('commit', '--quiet', '-am', 'Unlinked follow-up');

    const log = git(
      'log',
      '--all',
      '-n',
      '100',
      '--format=%H%x1f%h%x1f%aI%x1f%s%x1f%(trailers:key=Work-Item,valueonly,separator=%x2c)'
    );
    const commits = parseCommitLog(log);
    assert.equal(commits.length, 2);
    assert.deepEqual(commits[0].workItems, []);
    assert.deepEqual(commits[1].workItems, ['EPIC-demo/STORY-001/TASK-001']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
