import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';
import { normalizeDetailsMetadata } from '../utils/experience-details-metadata.js';
const Experience = sequelize.define('Experience', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    capacity: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    duration: DataTypes.INTEGER, // Duration in minutes
    // @deprecated — Use ScheduleTemplate records instead. Retained for rollback compatibility; not read or written by application code.
    scheduling: { type: DataTypes.STRING, allowNull: true },
    subtitle: DataTypes.TEXT,
    description: DataTypes.TEXT,
    ratings: DataTypes.DECIMAL(3, 2),
    commentsCount: DataTypes.INTEGER,
    images: { type: DataTypes.JSON },
    detailsMetadata: {
        type: DataTypes.JSON,
        allowNull: true,
        validate: {
            isSafeDetailsMetadata(value) {
                const { errors } = normalizeDetailsMetadata(value);
                if (errors.length) throw new Error(errors.join('; '));
            },
        },
    },
    thumbnail: DataTypes.STRING,
    userQuestionnary: { type: DataTypes.JSON },
    autoSyncEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    scheduleLookaheadDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 90,
        validate: { min: 1, max: 730 },
    },

}, {
    tableName: 'Experiences',
    timestamps: true,
    indexes: [
        {
            name: 'idx_experience_location',
            fields: ['LocationId']
        }
    ]
});

import { syncExperienceSchedule } from '../services/Scheduler.service.js';

Experience.afterCreate(async (experience) => {
    if (experience.autoSyncEnabled === false) return;
    // Run asynchronously to not block the request
    // eslint-disable-next-line no-console
    syncExperienceSchedule(experience).catch(err => console.error('Error syncing schedule after create:', err));
});

Experience.afterUpdate(async (experience) => {
    if (experience.autoSyncEnabled === false) return;
    // Run asynchronously to not block the request
    // eslint-disable-next-line no-console
    syncExperienceSchedule(experience).catch(err => console.error('Error syncing schedule after update:', err));
});

export default Experience;
