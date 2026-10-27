import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const PickedOccurrence = sequelize.define('PickedOccurrence', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dateTime: { type: DataTypes.DATE, allowNull: false, validate: { isDate: true } },
    endDateTime: { type: DataTypes.DATE, allowNull: true, validate: { isDate: true } },
    capacity: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'cancelled'), allowNull: false, defaultValue: 'active' },
    note: { type: DataTypes.TEXT, allowNull: true },
    source: { type: DataTypes.STRING, allowNull: true },
}, {
    tableName: 'PickedOccurrences',
    timestamps: true,
    validate: {
        endDateAfterStart() {
            if (this.endDateTime && this.endDateTime <= this.dateTime) {
                throw new Error('endDateTime must be after dateTime');
            }
        }
    }
});

export default PickedOccurrence;
