import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const ExperienceReservationAttendee = sequelize.define('ExperienceReservationAttendee', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: {
        type: DataTypes.ENUM('active', 'cancelled'),
        defaultValue: 'active',
        allowNull: false,
    },
}, {
    tableName: 'ExperienceReservationAttendees',
    timestamps: true,
});

export default ExperienceReservationAttendee;
