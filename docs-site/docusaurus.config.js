const path = require('node:path');

module.exports = {
  title: 'PV Today - Internal Docs',
  url: 'http://localhost:8080',
  baseUrl: '/internal/docs/',
  trailingSlash: true,
  onBrokenLinks: 'warn',
  markdown: {
    format: 'md',
    mermaid: true,
    hooks: { onBrokenMarkdownLinks: 'warn' },
  },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {
          path: path.resolve(__dirname, '..'),
          include: [
            'README.md',
            'DEPLOYMENT.md',
            'QUICKSTART.md',
            'frontend/README.md',
            'backend/README.MD',
            'docs/**/*.md',
          ],
          routeBasePath: '/guides',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: {},
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Internal Docs',
      items: [
        { to: '/work/', label: 'Work dashboard', position: 'left' },
        { to: '/guides/docs/planning/workflow', label: 'Planning', position: 'left' },
        { to: '/guides/docs/epics', label: 'Epics', position: 'left' },
        {
          type: 'html',
          value: '<a class="navbar__link" href="/">Back to app</a>',
          position: 'right',
        },
      ],
    },
    docs: { sidebar: { autoCollapseCategories: true } },
  },
};
