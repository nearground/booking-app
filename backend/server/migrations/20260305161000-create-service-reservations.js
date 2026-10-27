'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ServiceReservations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      confirmationCode: { type: Sequelize.STRING, allowNull: false, unique: true },
      numberOfAttendees: { type: Sequelize.INTEGER, allowNull: false },
      totalPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'attended', 'no-show', 'cancelled'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
      specialRequests: { type: Sequelize.TEXT, allowNull: true },
      attendeeNames: { type: Sequelize.JSON, allowNull: true },
      billingEmail: { type: Sequelize.STRING, allowNull: false },
      billingName: { type: Sequelize.STRING, allowNull: false },
      billingAddress: { type: Sequelize.STRING, allowNull: false },
      billingCity: { type: Sequelize.STRING, allowNull: false },
      billingState: { type: Sequelize.STRING, allowNull: false },
      billingPostalCode: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      CustomerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ScheduledServiceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ScheduledServices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ServiceReservations');
  },
};
