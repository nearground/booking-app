const { spawn } = require('node:child_process');
const path = require('node:path');

const docusaurusCli = require.resolve('@docusaurus/core/bin/docusaurus.mjs');
const children = [
  spawn(process.execPath, [path.join(__dirname, 'work-index.cjs')], { stdio: 'inherit' }),
  // Polling: file events from Windows/macOS bind mounts don't reach the container,
  // so merged Epic/Story/Task docs would otherwise stay stale until a restart.
  spawn(process.execPath, [docusaurusCli, 'start', '--host', '0.0.0.0', '--port', '3100', '--no-open', '--poll', '2000'], {
    cwd: __dirname,
    stdio: 'inherit',
  }),
];
let stopping = false;

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on('error', (error) => {
    console.error('Unable to start internal docs process:', error);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`Internal docs process exited (${signal || code})`);
      stop(code || 1);
    }
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(0));
}
