'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
   //Create headquarters and Location for Martin LLC, and an admin user
    const [existingLocation] = await queryInterface.sequelize.query(
      "SELECT id FROM Locations WHERE city = 'Puerto Vallarta' AND street = 'Flamingo 139' LIMIT 1"
    );

    // Create location first
    if (!existingLocation.length) {
      await queryInterface.bulkInsert('Locations', [{
        name: 'Martin LLC HQ',
        coordinates: Sequelize.fn('ST_GeomFromText', 'POINT(-105.2197882423707 20.64499179294367)'),
        country: 'Mexico',
        state: 'Jalisco',
        city: 'Puerto Vallarta',
        street: 'Flamingo 139',
        zipCode: '48328',
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    }

    // Get the location ID
    const [locations] = await queryInterface.sequelize.query(
      "SELECT id FROM Locations WHERE city = 'Puerto Vallarta' AND street = 'Flamingo 139'"
    );
    const locationId = locations[0]?.id;

    // Create organization
    const [existingOrganization] = await queryInterface.sequelize.query(
      "SELECT id FROM Organizations WHERE name = 'Martin LLC' LIMIT 1"
    );
    if (!existingOrganization.length) {
      await queryInterface.bulkInsert('Organizations', [{
        name: 'Martin LLC',
        organizationUsername: 'martinllc',
        email: 'contact@martinllc.com',
        LocationId: locationId,
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    }

    // Get the organization ID
    const [organizations] = await queryInterface.sequelize.query(
      "SELECT id FROM Organizations WHERE name = 'Martin LLC'"
    );
    const organizationId = organizations[0]?.id;

    if (organizationId && locationId) {
      await queryInterface.bulkUpdate(
        'Locations',
        {
          OrganizationId: organizationId,
          updatedAt: new Date(),
        },
        { id: locationId },
        {}
      );
    }

    // Create admin user
    const [existingAdmin] = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE email = 'admin@martinllc.com' LIMIT 1"
    );
    if (!existingAdmin.length) {
      await queryInterface.bulkInsert('Users', [{
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        email: 'admin@martinllc.com',
        password: '$2a$10$mrRYiTpW5hXrqqd0Pds9Wu7YtfBpN7ZukE.AkuZscpKqX5BBuEu.a', // hash for "adminpassword"
        phoneNumber: '1234567890',
        country: 'Mexico',
        isEmailVerified: true,
        isRegistered: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    }

    // Get the user ID
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE email = 'admin@martinllc.com'"
    );
    const userId = users[0]?.id;

    // Add user to organization with admin privileges
    const [existingMembership] = await queryInterface.sequelize.query(
      `SELECT UserId, OrganizationId
       FROM OrganizationMembers
       WHERE UserId = :userId AND OrganizationId = :organizationId
       LIMIT 1`,
      { replacements: { userId, organizationId } }
    );

    if (!existingMembership.length) {
      await queryInterface.bulkInsert('OrganizationMembers', [{
        UserId: userId,
        OrganizationId: organizationId,
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    }

    const [existingOrganizer] = await queryInterface.sequelize.query(
      `SELECT id
       FROM Organizers
       WHERE UserId = :userId
       LIMIT 1`,
      { replacements: { userId } }
    );

    const adminOrganizerDescription = 'Lead organizer for Martin LLC experiences, focused on quality experience execution and guest satisfaction.';

    if (!existingOrganizer.length) {
      await queryInterface.bulkInsert('Organizers', [{
        UserId: userId,
        description: adminOrganizerDescription,
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    } else {
      await queryInterface.bulkUpdate(
        'Organizers',
        {
          description: adminOrganizerDescription,
          updatedAt: new Date(),
        },
        { UserId: userId },
        {}
      );
    }
  },

  async down (queryInterface) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [users] = await queryInterface.sequelize.query(
        "SELECT id FROM Users WHERE email = 'admin@martinllc.com'",
        { transaction }
      );
      const userId = users[0]?.id;

      const [orgs] = await queryInterface.sequelize.query(
        "SELECT id FROM Organizations WHERE name = 'Martin LLC'",
        { transaction }
      );
      const organizationId = orgs[0]?.id;

      if (userId && organizationId) {
        await queryInterface.bulkDelete(
          'OrganizationMembers',
          {
            UserId: userId,
            OrganizationId: organizationId,
          },
          { transaction }
        );
      }

      if (userId) {
        await queryInterface.bulkDelete(
          'Organizers',
          { UserId: userId },
          { transaction }
        );
      }

      await queryInterface.bulkDelete(
        'Users',
        { email: 'admin@martinllc.com' },
        { transaction }
      );
      await queryInterface.bulkDelete(
        'Organizations',
        { name: 'Martin LLC' },
        { transaction }
      );
      await queryInterface.bulkDelete(
        'Locations',
        { city: 'Puerto Vallarta', street: 'Flamingo 139' },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
