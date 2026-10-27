const path = require('node:path');
const { computeWaves } = require('../work-waves.cjs');

const repositoryRoot = path.resolve(__dirname, '..', '..');

// Exposes Epic/Story/Task front matter as plugin data for build-time tables.
module.exports = function workDocsPlugin() {
  return {
    name: 'work-docs',

    getPathsToWatch() {
      return [path.join(repositoryRoot, 'docs', 'epics', '**', '*.md')];
    },

    async loadContent() {
      const { loadWorkDocuments } = await import('../../scripts/planning.mjs');
      const documents = await loadWorkDocuments(repositoryRoot);
      const items = documents.map(({ data, filePath }) => {
        const relative = path.relative(path.join(repositoryRoot, 'docs'), filePath).replaceAll('\\', '/');
        return {
          id: data.work_id,
          type: data.work_type,
          title: data.title,
          status: data.status,
          branch: data.branch,
          parent: data.parent || null,
          dependsOn: data.depends_on || [],
          route: `/${relative.replace(/\.md$/i, '').replace(/(^|\/)index$/i, '')}/`,
        };
      });
      const waves = computeWaves(items.filter((item) => item.type === 'epic'));
      return items.map((item) => ({ ...item, wave: waves.get(item.id) || null }));
    },

    async contentLoaded({ content, actions }) {
      actions.setGlobalData({ workItems: content });
    },
  };
};
