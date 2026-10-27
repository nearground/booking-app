'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Services', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      duration: { type: Sequelize.INTEGER, allowNull: true },
      scheduling: { type: Sequelize.STRING, allowNull: true },
      subtitle: { type: Sequelize.TEXT, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      ratings: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
      images: { type: Sequelize.JSON, allowNull: true },
      thumbnail: { type: Sequelize.STRING, allowNull: true },
      userQuestionnary: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      OrganizationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      LocationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.addIndex('Services', ['LocationId'], { name: 'idx_service_location' });

    await queryInterface.createTable('ScheduledServices', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      dateTime: { type: Sequelize.DATE, allowNull: false },
      endDateTime: { type: Sequelize.DATE, allowNull: true },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      availableSpots: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('waitlisted', 'scheduled', 'in-progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'waitlisted',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      ServiceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Services', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.createTable('ServiceOrganizers', {
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      ServiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Services', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.addConstraint('ServiceOrganizers', {
      fields: ['ServiceId', 'UserId'],
      type: 'unique',
      name: 'unique_service_organizer',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('ServiceOrganizers', 'unique_service_organizer');
    await queryInterface.dropTable('ServiceOrganizers');
    await queryInterface.dropTable('ScheduledServices');
    await queryInterface.dropTable('Services');

  },
};
