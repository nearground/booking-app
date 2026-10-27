const path = require('node:path');

const { sidebarItemsGenerator } = require('./sidebar-items.cjs');

const docsRoot = path.resolve(__dirname, '..', 'docs');

module.exports = {
  title: 'PV Today - Internal Docs',
  tagline: 'Project planning, work tracking and technical reference',
  url: 'http://localhost:8080',
  baseUrl: '/internal/docs/',
  trailingSlash: true,
  onBrokenLinks: 'warn',
  markdown: {
    format: 'detect',
    mermaid: true,
    hooks: { onBrokenMarkdownLinks: 'warn' },
  },
  themes: ['@docusaurus/theme-mermaid'],
  plugins: [require.resolve('./plugins/work-docs.cjs')],
  presets: [
    [
      'classic',
      {
        docs: {
          path: docsRoot,
          include: [
            'planning/**/*.{md,mdx}',
            'epics/**/*.{md,mdx}',
            'templates/**/*.{md,mdx}',
            'reference/**/*.{md,mdx}',
          ],
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          sidebarItemsGenerator,
          breadcrumbs: true,
        },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Internal Docs',
      items: [
        {
          type: 'dropdown',
          label: 'Planning',
          to: '/epics/',
          activeBaseRegex: '/(epics|work|planning|templates)/',
          position: 'left',
          items: [
            { to: '/epics/', label: 'Epics', activeBaseRegex: '/epics/' },
            { to: '/work/', label: 'Work dashboard', activeBaseRegex: '/work/' },
            { to: '/planning/workflow/', label: 'Workflow', activeBaseRegex: '/planning/' },
            { to: '/templates/EPIC_TEMPLATE/', label: 'Templates', activeBaseRegex: '/templates/' },
          ],
        },
        { to: '/reference/', label: 'Reference', position: 'left', activeBasePath: 'reference' },
        {
          type: 'html',
          value: '<a class="navbar__link" href="/">Back to app</a>',
          position: 'right',
        },
      ],
    },
    docs: { sidebar: { autoCollapseCategories: true, hideable: true } },
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
  },
};
