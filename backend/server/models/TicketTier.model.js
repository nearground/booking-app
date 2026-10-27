import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const TicketTier = sequelize.define('TicketTier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false, validate: { min: 0 } },
    title: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    userQuestionnary: { type: DataTypes.JSON, allowNull: true },
    minAge: { type: DataTypes.INTEGER, allowNull: false },
    maxAge: { type: DataTypes.INTEGER, allowNull: true },
    maxTickets: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
    idType: { type: DataTypes.STRING, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    tableName: 'TicketTiers',
    timestamps: true,
    validate: {
        maxAgeGreaterThanMinAge() {
            if (this.maxAge !== null && this.maxAge <= this.minAge) {
                throw new Error('Max age must be greater than min age');
            }
        }
    }
});

export default TicketTier;
