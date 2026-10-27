'use strict';

const RESERVED_SLUGS = new Set(['www', 'api', 'admin', 'internal', 'app', 'mail', 'static', 'assets', 'docs', 'ftp', 'smtp', 'cdn', 'support', 'help', 'blog', 'dev', 'staging', 'test', 'localhost', 'root', 'security', 'status', 'dashboard', 'login', 'auth']);
const toSlug = (value) => {
  const slug = String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63).replace(/-$/g, '');
  const usable = slug.length < 3 ? `org-${slug}` : slug;
  return RESERVED_SLUGS.has(usable) ? `org-${usable}` : usable;
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add organizationUsername column (nullable initially for backfill)
    await queryInterface.addColumn('Organizations', 'organizationUsername', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 2. Backfill existing orgs: lowercased name with non-alphanumeric chars removed
    const [orgs] = await queryInterface.sequelize.query(
      'SELECT id, name FROM Organizations WHERE organizationUsername IS NULL'
    );

    const usedOrgUsernames = new Set();

    for (const org of orgs) {
      let base = org.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (base.length < 3) base = 'org';

      let candidate = base;
      let suffix = 1;

      while (usedOrgUsernames.has(candidate)) {
        candidate = `${base}${suffix}`;
        suffix++;
      }

      usedOrgUsernames.add(candidate);

      await queryInterface.sequelize.query(
        'UPDATE Organizations SET organizationUsername = :orgUsername WHERE id = :id',
        { replacements: { orgUsername: candidate, id: org.id } }
      );
    }

    // 3. Make non-nullable and unique
    await queryInterface.changeColumn('Organizations', 'organizationUsername', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addIndex('Organizations', ['organizationUsername'], {
      unique: true,
      name: 'organizations_org_username_unique',
    });

    // Define branding here so the initial migration sequence is complete before seeding.
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
    await queryInterface.removeIndex('Organizations', 'organizations_org_username_unique').catch(() => {});
    await queryInterface.removeColumn('Organizations', 'organizationUsername');
  },
};
