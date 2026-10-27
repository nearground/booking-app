'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ScheduleTemplates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: true },
      type: { type: Sequelize.ENUM('recurring'), allowNull: false, defaultValue: 'recurring' },
      ruleType: { type: Sequelize.ENUM('cron','datetime'), allowNull: false, defaultValue: 'cron' },
      ruleCron: { type: Sequelize.STRING, allowNull: true },
      ruleDateTime: { type: Sequelize.DATE, allowNull: true },
      timezone: { type: Sequelize.STRING, allowNull: false, defaultValue: 'UTC' },
      durationMinutes: { type: Sequelize.INTEGER, allowNull: true },
      capacity: { type: Sequelize.INTEGER, allowNull: true },
      startDate: { type: Sequelize.DATE, allowNull: true },
      endDate: { type: Sequelize.DATE, allowNull: true },
      maxOccurrences: { type: Sequelize.INTEGER, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ExperienceId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Experiences', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('PickedOccurrences', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      dateTime: { type: Sequelize.DATE, allowNull: false },
      endDateTime: { type: Sequelize.DATE, allowNull: true },
      capacity: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.ENUM('active','cancelled'), allowNull: false, defaultValue: 'active' },
      note: { type: Sequelize.TEXT, allowNull: true },
      source: { type: Sequelize.STRING, allowNull: true },
      ExperienceId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Experiences', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Add linking columns to the existing ScheduledExperiences table so sessions can reference their source
    await queryInterface.addColumn('ScheduledExperiences', 'ScheduleTemplateId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'ScheduleTemplates', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('ScheduledExperiences', 'PickedOccurrenceId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'PickedOccurrences', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('ScheduledExperiences', ['ExperienceId'], { name: 'idx_scheduled_experiences_experience_id' });
    await queryInterface.addIndex('ScheduledExperiences', ['dateTime'], { name: 'idx_scheduled_experiences_date_time' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('ScheduledExperiences', 'idx_scheduled_experiences_date_time');
    await queryInterface.removeIndex('ScheduledExperiences', 'idx_scheduled_experiences_experience_id');
    await queryInterface.removeColumn('ScheduledExperiences', 'PickedOccurrenceId');
    await queryInterface.removeColumn('ScheduledExperiences', 'ScheduleTemplateId');
    await queryInterface.dropTable('PickedOccurrences');
    await queryInterface.dropTable('ScheduleTemplates');
  }
};
