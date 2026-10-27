// Full message (%B) and git notes (%N) are read instead of %(trailers): Git's trailer
// parser drops blocks with CRLF line endings, and notes allow explicit backfills
// for pushed commits without rewriting history.
const LOG_FORMAT = '--format=%H%x1f%h%x1f%aI%x1f%s%x1f%B%x1f%N%x1e';

function extractWorkItems(text) {
  const items = [];
  for (const match of String(text || '').matchAll(/^[ \t]*Work-Item:[ \t]*(.+?)[ \t]*\r?$/gim)) {
    for (const value of match[1].split(',')) {
      const id = value.trim();
      if (id && !items.includes(id)) items.push(id);
    }
  }
  return items;
}

function parseCommitLog(output) {
  return output
    .split('\x1e')
    .map((record) => record.replace(/^\s+/, ''))
    .filter(Boolean)
    .map((record) => {
      const [sha, shortSha, date, subject, body = '', notes = ''] = record.split('\x1f');
      const message = body.split(/\r?\n/).slice(1).join('\n');
      return {
        sha,
        shortSha,
        date,
        subject,
        workItems: extractWorkItems(`${message}\n${notes}`),
      };
    });
}

// A commit belongs to a work item when it names that item or any descendant of it.
function commitsForWorkItem(commits, id) {
  const prefix = `${id}/`;
  return commits.filter((commit) => commit.workItems
    .some((item) => item === id || item.startsWith(prefix)));
}

function githubRemoteUrl(value) {
  const remote = String(value || '').trim();
  const match = remote.match(/^(?:https?:\/\/github\.com\/|git@github\.com:)([^/]+\/[^/]+?)(?:\.git)?$/i);
  return match ? `https://github.com/${match[1]}` : null;
}

module.exports = {
  LOG_FORMAT,
  commitsForWorkItem,
  extractWorkItems,
  githubRemoteUrl,
  parseCommitLog,
};
