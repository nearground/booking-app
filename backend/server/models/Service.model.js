import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';
const Service = sequelize.define('Service', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    capacity: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    duration: DataTypes.INTEGER,
    scheduling: DataTypes.STRING,
    subtitle: DataTypes.TEXT,
    description: DataTypes.TEXT,
    ratings: DataTypes.DECIMAL(3, 2),
    images: { type: DataTypes.JSON },
    thumbnail: DataTypes.STRING,
    userQuestionnary: { type: DataTypes.JSON },
}, {
    tableName: 'Services',
    timestamps: true,
    indexes: [
        {
            name: 'idx_service_location',
            fields: ['LocationId'],
        },
    ],
});

import { syncServiceSchedule } from '../services/Scheduler.service.js';

Service.afterCreate(async (service) => {
    if (service.scheduling) {
        syncServiceSchedule(service).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('Error syncing service schedule after create:', error);
        });
    }
});

Service.afterUpdate(async (service) => {
    if (service.scheduling && service.changed('scheduling')) {
        syncServiceSchedule(service).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('Error syncing service schedule after update:', error);
        });
    }
});

export default Service;
