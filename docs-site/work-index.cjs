const http = require('node:http');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const {
  LOG_FORMAT,
  commitsForWorkItem,
  parseCommitLog,
  githubRemoteUrl,
} = require('./git-utils.cjs');
const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(__dirname, '..');
process.env.WORKSPACE_ROOT = repositoryRoot;

async function runGit(args) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trim();
}

async function buildWorkIndex() {
  const { loadWorkDocuments } = await import('../scripts/planning.mjs');
  const documents = await loadWorkDocuments(repositoryRoot);
  let commits = [];
  let gitAvailable = true;
  let gitMessage = '';
  let repoUrl = null;

  try {
    const output = await runGit([
      'log',
      '--exclude=refs/notes/*',
      '--all',
      '-n',
      '300',
      '--notes',
      LOG_FORMAT,
    ]);
    commits = parseCommitLog(output);
    const remote = await runGit(['remote', 'get-url', 'origin']).catch(() => '');
    repoUrl = githubRemoteUrl(remote);
    if (repoUrl) {
      const remoteHistory = await runGit(['log', '--remotes', '-n', '300', '--format=%H'])
        .catch(() => '');
      const remoteCommits = new Set(remoteHistory.split(/\r?\n/).filter(Boolean));
      for (const commit of commits) {
        commit.githubUrl = remoteCommits.has(commit.sha)
          ? `${repoUrl}/commit/${commit.sha}`
          : null;
      }
    }
  } catch (error) {
    gitAvailable = false;
    gitMessage = error.code === 'ENOENT'
      ? 'Git is not installed in the docs service.'
      : 'Repository Git metadata is unavailable. Start the docs service from a Git checkout with its .git directory mounted.';
  }

  const taskItems = documents
    .filter(({ data }) => data.work_type === 'task')
    .map(({ data, filePath }) => ({
      id: data.work_id,
      title: data.title,
      status: data.status,
      branch: data.branch,
      path: path.relative(repositoryRoot, filePath).replaceAll('\\', '/'),
      commits: commitsForWorkItem(commits, data.work_id),
    }));

  return {
    generatedAt: new Date().toISOString(),
    git: { available: gitAvailable, message: gitMessage },
    workItems: documents.map(({ data, filePath }) => ({
      id: data.work_id,
      title: data.title,
      type: data.work_type,
      status: data.status,
      branch: data.branch,
      path: path.relative(repositoryRoot, filePath).replaceAll('\\', '/'),
      parent: data.parent,
      commits: commitsForWorkItem(commits, data.work_id),
    })),
    tasks: taskItems,
    commits,
    repositoryUrl: repoUrl,
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');
  if (request.method !== 'GET') {
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  if (requestUrl.pathname === '/work-index') {
    try {
      const index = await buildWorkIndex();
      return sendJson(response, 200, index);
    } catch (error) {
      console.error('Unable to build project work index:', error);
      return sendJson(response, 500, { error: 'Unable to build project work index' });
    }
  }

  const match = requestUrl.pathname.match(/^\/commit\/([a-f0-9]{40})$/i);
  if (match) {
    try {
      const index = await buildWorkIndex();
      const commit = index.commits.find((item) => item.sha === match[1]);
      if (!commit) return sendJson(response, 404, { error: 'Commit is not in local Git history' });
      const files = await runGit(['show', '--format=', '--name-only', '-z', commit.sha]);
      return sendJson(response, 200, {
        commit,
        files: files.split('\0').filter(Boolean),
      });
    } catch (error) {
      console.error('Unable to read Git commit:', error);
      return sendJson(response, 503, { error: 'Repository Git metadata is unavailable' });
    }
  }

  return sendJson(response, 404, { error: 'Not found' });
});

const port = Number(process.env.WORK_INDEX_PORT || 3101);
server.listen(port, '0.0.0.0', () => {
  console.log(`Work index API listening on ${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
