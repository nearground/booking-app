'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Locations', 'idx_location_org_name');
    await queryInterface.addIndex('Locations', ['OrganizationId', 'name'], {
      name: 'idx_location_org_name',
      unique: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Locations', 'idx_location_org_name');
    await queryInterface.addIndex('Locations', ['OrganizationId', 'name'], {
      name: 'idx_location_org_name',
      unique: true,
    });
  },
};
