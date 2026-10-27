import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const PasswordReset = sequelize.define(
    'PasswordReset',
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        email: { type: DataTypes.STRING, allowNull: false },
        token: { type: DataTypes.STRING, allowNull: false, unique: true },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        usedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: 'PasswordResets',
        timestamps: true,
        indexes: [
            { fields: ['email'] },
            { fields: ['token'] },
        ],
    }
);

export default PasswordReset;
