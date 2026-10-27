'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Restrict each user to belong to at most one organization
    await queryInterface.addConstraint('OrganizationMembers', {
      fields: ['UserId'],
      type: 'unique',
      name: 'uq_organization_members_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('OrganizationMembers', 'uq_organization_members_user_id');
  },
};
