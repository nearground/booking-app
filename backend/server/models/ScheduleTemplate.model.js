import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const ScheduleTemplate = sequelize.define('ScheduleTemplate', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.ENUM('recurring'), allowNull: false, defaultValue: 'recurring' },
    // rule can be either a cron expression (ruleCron) or a single explicit date-time (ruleDateTime)
    ruleType: { type: DataTypes.ENUM('cron', 'datetime'), allowNull: false, defaultValue: 'cron' },
    ruleCron: { type: DataTypes.STRING, allowNull: true },
    ruleDateTime: { type: DataTypes.DATE, allowNull: true },
    timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: 'UTC' },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: true },
    capacity: { type: DataTypes.INTEGER, allowNull: true },
    startDate: { type: DataTypes.DATE, allowNull: true },
    endDate: { type: DataTypes.DATE, allowNull: true },
    maxOccurrences: { type: DataTypes.INTEGER, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: 'ScheduleTemplates',
    timestamps: true,
});

export default ScheduleTemplate;
