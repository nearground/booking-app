function parseCommitLog(output) {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, date, subject, trailerList = ''] = line.split('\x1f');
      return {
        sha,
        shortSha,
        date,
        subject,
        workItems: trailerList
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      };
    });
}

function githubRemoteUrl(value) {
  const remote = String(value || '').trim();
  const match = remote.match(/^(?:https?:\/\/github\.com\/|git@github\.com:)([^/]+\/[^/]+?)(?:\.git)?$/i);
  return match ? `https://github.com/${match[1]}` : null;
}

module.exports = { githubRemoteUrl, parseCommitLog };
