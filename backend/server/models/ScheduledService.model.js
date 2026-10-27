import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const ScheduledService = sequelize.define('ScheduledService', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dateTime: { type: DataTypes.DATE, allowNull: false, validate: { isDate: true } },
    endDateTime: { type: DataTypes.DATE, allowNull: true, validate: { isDate: true } },
    capacity: { type: DataTypes.INTEGER, allowNull: false },
    availableSpots: { type: DataTypes.INTEGER, allowNull: false },
    status: {
        type: DataTypes.ENUM('waitlisted', 'scheduled', 'in-progress', 'completed', 'cancelled'),
        defaultValue: 'waitlisted',
        allowNull: false,
    },
}, {
    tableName: 'ScheduledServices',
    timestamps: true,
    validate: {
        endDateTimeAfterDateTime() {
            if (this.endDateTime && this.endDateTime <= this.dateTime) {
                throw new Error('End date/time must be after start date/time');
            }
        },
    },
});

export default ScheduledService;
