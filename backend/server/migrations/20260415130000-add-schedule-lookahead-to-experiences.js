'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Experiences', 'scheduleLookaheadDays', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 90,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Experiences', 'scheduleLookaheadDays');
  },
};
