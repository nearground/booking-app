import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const EmailVerificationToken = sequelize.define('EmailVerificationToken', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: 'EmailVerificationTokens',
    timestamps: true,
    indexes: [{ fields: ['email'] }],
});

export default EmailVerificationToken;
