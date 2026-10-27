import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

//For defining Hotel and Experience locations, and maybe points of interest.
const Location = sequelize.define('Location', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    coordinates: { type: DataTypes.GEOMETRY('POINT'), allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    street: { type: DataTypes.STRING, allowNull: false },
    zipCode: { type: DataTypes.STRING, allowNull: false },
    timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: 'UTC' },
    OrganizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Organizations',
            key: 'id',
        },
    },
    notes: DataTypes.TEXT,
}, {
    tableName: 'Locations',
    timestamps: true,
    indexes: [
        {
            name: 'idx_location_city',
            fields: ['city']
        },
        {
            name: 'idx_location_org_name',
            unique: false,
            fields: ['OrganizationId', 'name']
        },
        {
            name: 'idx_location_country',
            fields: ['country']
        },
        {
            name: 'idx_location_organization',
            fields: ['OrganizationId']
        },
        {
            name: 'idx_location_coordinates',
            type: 'SPATIAL',
            fields: ['coordinates']
        }
    ]
});

export default Location;
