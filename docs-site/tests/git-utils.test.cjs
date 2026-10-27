const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  LOG_FORMAT,
  commitsForWorkItem,
  githubRemoteUrl,
  parseCommitLog,
} = require('../git-utils.cjs');

const record = (sha, subject, body = '', notes = '') =>
  `${sha}\x1f${sha.slice(0, 7)}\x1f2026-10-26T12:00:00-07:00\x1f${subject}\x1f${subject}\n\n${body}\x1f${notes}\x1e`;

test('parses commit identity, subject and exact Work-Item lines', () => {
  const sha = 'a'.repeat(40);
  const result = parseCommitLog(record(sha, 'Add attendee list',
    'Work-Item: EPIC-tools/STORY-001/TASK-001\nWork-Item: EPIC-tools/STORY-002/TASK-003\n'));
  assert.equal(result.length, 1);
  assert.equal(result[0].sha, sha);
  assert.deepEqual(result[0].workItems, [
    'EPIC-tools/STORY-001/TASK-001',
    'EPIC-tools/STORY-002/TASK-003',
  ]);
});

test('reads Work-Item lines with CRLF endings, mixed with other trailers, and from notes', () => {
  const result = parseCommitLog(record('c'.repeat(40), 'Fix cart',
    'Details\r\n\r\nWork-Item: EPIC-a/STORY-001/TASK-001\r\nCo-authored-by: Someone <x@example.invalid>\r\n',
    'Work-Item: EPIC-a/STORY-002/TASK-001\n'));
  assert.deepEqual(result[0].workItems, ['EPIC-a/STORY-001/TASK-001', 'EPIC-a/STORY-002/TASK-001']);
});

test('does not infer task association from commit subjects', () => {
  const result = parseCommitLog(record('b'.repeat(40), 'Work-Item: TASK-001 is in this subject'));
  assert.deepEqual(result[0].workItems, []);
});

test('rolls Task commits up to their Story and Epic without crossing prefixes', () => {
  const commits = [
    { sha: '1', workItems: ['EPIC-a/STORY-001/TASK-001'] },
    { sha: '2', workItems: ['EPIC-a'] },
    { sha: '3', workItems: ['EPIC-ab/STORY-001/TASK-001'] },
  ];
  assert.deepEqual(commitsForWorkItem(commits, 'EPIC-a').map((c) => c.sha), ['1', '2']);
  assert.deepEqual(commitsForWorkItem(commits, 'EPIC-a/STORY-001').map((c) => c.sha), ['1']);
  assert.deepEqual(commitsForWorkItem(commits, 'EPIC-a/STORY-002'), []);
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
    git('notes', 'add', '-m', 'Work-Item: EPIC-demo/STORY-002/TASK-001', 'HEAD');

    const log = git('log', '--exclude=refs/notes/*', '--all', '-n', '100', '--notes', LOG_FORMAT);
    const commits = parseCommitLog(log);
    assert.equal(commits.length, 2);
    assert.deepEqual(commits[0].workItems, ['EPIC-demo/STORY-002/TASK-001']);
    assert.deepEqual(commits[1].workItems, ['EPIC-demo/STORY-001/TASK-001']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
