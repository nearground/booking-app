'use strict';

const RESERVED_SLUGS = new Set(['www', 'api', 'admin', 'internal', 'app', 'mail', 'static', 'assets', 'docs', 'ftp', 'smtp', 'cdn', 'support', 'help', 'blog', 'dev', 'staging', 'test', 'localhost', 'root', 'security', 'status', 'dashboard', 'login', 'auth']);
const toSlug = (value) => {
  const slug = String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63).replace(/-$/g, '');
  const usable = slug.length < 3 ? `org-${slug}` : slug;
  return RESERVED_SLUGS.has(usable) ? `org-${usable}` : usable;
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Organizations', 'slug', { type: Sequelize.STRING(63), allowNull: true });
    const [organizations] = await queryInterface.sequelize.query('SELECT id, organizationUsername FROM Organizations');
    for (const organization of organizations) {
      await queryInterface.bulkUpdate('Organizations', { slug: toSlug(organization.organizationUsername) }, { id: organization.id });
    }
    await queryInterface.changeColumn('Organizations', 'slug', { type: Sequelize.STRING(63), allowNull: false });
    await queryInterface.addIndex('Organizations', ['slug'], { name: 'uq_organizations_slug', unique: true });
    const fields = {
      logoMediaKey: { type: Sequelize.STRING(512), allowNull: true },
      coverMediaKey: { type: Sequelize.STRING(512), allowNull: true },
      coverMediaType: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'image' },
      primaryColor: { type: Sequelize.STRING(7), allowNull: false, defaultValue: '#0f766e' },
      accentColor: { type: Sequelize.STRING(7), allowNull: false, defaultValue: '#f59e0b' },
      font: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'system' },
      tagline: { type: Sequelize.STRING(160), allowNull: false, defaultValue: '' },
      about: { type: Sequelize.TEXT, allowNull: true },
      socialLinks: { type: Sequelize.JSON, allowNull: true },
      contactLinks: { type: Sequelize.JSON, allowNull: true },
      layoutTemplate: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'classic' },
    };
    for (const [name, definition] of Object.entries(fields)) {
      await queryInterface.addColumn('Organizations', name, definition);
    }
    await queryInterface.bulkUpdate('Organizations', { about: '' }, { about: null });
    await queryInterface.bulkUpdate('Organizations', { socialLinks: '{}' }, { socialLinks: null });
    await queryInterface.bulkUpdate('Organizations', { contactLinks: '{}' }, { contactLinks: null });
    for (const [name, definition] of Object.entries({ about: { type: Sequelize.TEXT, allowNull: false }, socialLinks: { type: Sequelize.JSON, allowNull: false }, contactLinks: { type: Sequelize.JSON, allowNull: false } })) {
      await queryInterface.changeColumn('Organizations', name, definition);
    }
  },

  async down(queryInterface) {
    for (const name of ['logoMediaKey', 'coverMediaKey', 'coverMediaType', 'primaryColor', 'accentColor', 'font', 'tagline', 'about', 'socialLinks', 'contactLinks', 'layoutTemplate']) {
      await queryInterface.removeColumn('Organizations', name);
    }
    await queryInterface.removeIndex('Organizations', 'uq_organizations_slug');
    await queryInterface.removeColumn('Organizations', 'slug');
  },
};
