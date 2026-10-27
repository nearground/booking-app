'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add username column (nullable initially for backfill)
    await queryInterface.addColumn('Users', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 2. Backfill existing users with username derived from email prefix
    const [users] = await queryInterface.sequelize.query(
      'SELECT id, email, firstName, lastName FROM Users WHERE username IS NULL'
    );

    const usedUsernames = new Set();

    for (const user of users) {
      let base = user.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');

      if (base.length < 3) {
        base = ((user.firstName || '') + (user.lastName || ''))
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '');
      }

      if (base.length < 3) base = 'user';

      let candidate = base;
      let suffix = 1;

      while (usedUsernames.has(candidate)) {
        candidate = `${base}${suffix}`;
        suffix++;
      }

      usedUsernames.add(candidate);

      await queryInterface.sequelize.query(
        'UPDATE Users SET username = :username WHERE id = :id',
        { replacements: { username: candidate, id: user.id } }
      );
    }

    // 3. Make username non-nullable and add unique index
    await queryInterface.changeColumn('Users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addIndex('Users', ['username'], {
      unique: true,
      name: 'users_username_unique',
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Users', 'users_username_unique').catch(() => {});
    await queryInterface.removeColumn('Users', 'username');

    // Restore unique index on email
    const indexes = await queryInterface.showIndex('Users');
    const hasEmailUnique = indexes.some(
      (idx) =>
        idx.unique &&
        idx.fields &&
        idx.fields.some((f) => (f.attribute || f) === 'email')
    );

    if (!hasEmailUnique) {
      await queryInterface.addIndex('Users', ['email'], {
        unique: true,
        name: 'Users_email_key',
      });
    }
  },
};
