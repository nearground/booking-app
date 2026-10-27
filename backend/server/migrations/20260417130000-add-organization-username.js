'use strict';

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
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Organizations', 'organizations_org_username_unique').catch(() => {});
    await queryInterface.removeColumn('Organizations', 'organizationUsername');
  },
};
