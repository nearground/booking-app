import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, validateWorkDocuments } from './planning.mjs';

function epic(status = 'draft') {
  return {
    filePath: 'docs/epics/sample/index.md',
    content: `---
title: Sample
work_id: EPIC-sample
work_type: epic
template_version: 1
status: ${status}
parent: null
branch: epic/sample
depends_on: []
---

## Outcome

${status === 'draft' ? '{{outcome}}' : 'A testable outcome.'}

<!-- children:start -->
<!-- children:end -->`,
    data: {
      title: 'Sample',
      work_id: 'EPIC-sample',
      work_type: 'epic',
      template_version: 1,
      status,
      parent: null,
      branch: 'epic/sample',
      depends_on: [],
    },
  };
}

function story(parent = 'EPIC-sample', status = 'draft') {
  return {
    filePath: 'docs/epics/sample/stories/STORY-001-slice/index.md',
    content: `---
title: Slice
work_id: ${parent}/STORY-001
work_type: story
template_version: 1
status: ${status}
parent: ${parent}
branch: epic/sample
depends_on: []
---

Parent: [${parent}](../../index.md)

<!-- children:start -->
<!-- children:end -->`,
    data: {
      title: 'Slice',
      work_id: `${parent}/STORY-001`,
      work_type: 'story',
      template_version: 1,
      status,
      parent,
      branch: 'epic/sample',
      depends_on: [],
    },
  };
}

test('parses document front matter and preserves body', () => {
  const result = parseFrontmatter('---\ntitle: Example\nstatus: draft\n---\n\nBody');
  assert.equal(result.data.title, 'Example');
  assert.equal(result.data.status, 'draft');
  assert.equal(result.body, '\nBody');
});

test('rejects missing or non-mapping front matter', () => {
  assert.throws(() => parseFrontmatter('# Not front matter'), /front matter is required/);
  assert.throws(() => parseFrontmatter('---\n- item\n---\n'), /YAML mapping/);
});

test('accepts draft Epic and child Story with inherited branch and parent link', () => {
  assert.deepEqual(validateWorkDocuments([epic(), story()]), []);
});

test('rejects a child with no parent and branch mismatch', () => {
  const child = story('EPIC-missing');
  child.data.branch = 'epic/other';
  assert(validateWorkDocuments([epic(), child]).some((issue) => issue.includes('parent EPIC-missing does not exist')));
  child.data.parent = 'EPIC-sample';
  child.data.work_id = 'EPIC-sample/STORY-001';
  assert(validateWorkDocuments([epic(), child]).some((issue) => issue.includes('branch must match parent')));
});

test('rejects unfinished placeholders outside draft status', () => {
  const readyEpic = epic();
  readyEpic.data.status = 'ready';
  readyEpic.content = readyEpic.content.replace('status: draft', 'status: ready');
  assert(validateWorkDocuments([readyEpic]).some((issue) => issue.includes('template placeholders')));
});

test('rejects dependency cycles', () => {
  const first = epic();
  const second = {
    ...epic(),
    filePath: 'docs/epics/second/index.md',
    data: {
      title: 'Second',
      work_id: 'EPIC-second',
      work_type: 'epic',
      template_version: 1,
      status: 'draft',
      parent: null,
      branch: 'epic/second',
      depends_on: ['EPIC-sample'],
    },
  };
  first.data.depends_on = ['EPIC-second'];
  assert(validateWorkDocuments([first, second]).some((issue) => issue.includes('Dependency cycle')));
});

test('create scaffolds an Epic with correctly quoted front matter values', async () => {
  const { mkdtemp, mkdir, cp, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const workspace = await mkdtemp(path.join(tmpdir(), 'planning-'));
  try {
    await mkdir(path.join(workspace, 'docs', 'epics'), { recursive: true });
    await cp(path.join(repoRoot, 'docs', 'templates'), path.join(workspace, 'docs', 'templates'), { recursive: true });
    execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'planning.mjs'), 'create', 'epic', 'quoted', '--title', 'Say "hi"'], {
      cwd: workspace,
      env: { ...process.env, WORKSPACE_ROOT: workspace },
    });
    const content = await readFile(path.join(workspace, 'docs', 'epics', 'quoted', 'index.md'), 'utf8');
    const { data } = parseFrontmatter(content);
    assert.equal(data.title, 'Say "hi"');
    assert.equal(data.work_id, 'EPIC-quoted');
    assert.equal(data.branch, 'epic/quoted');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
