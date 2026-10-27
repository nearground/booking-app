import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const OrganizationInvite = sequelize.define(
    'OrganizationInvite',
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        OrganizationId: { type: DataTypes.INTEGER, allowNull: false },
        invitedByUserId: { type: DataTypes.INTEGER, allowNull: true },
        email: { type: DataTypes.STRING, allowNull: false },
        code: { type: DataTypes.STRING, allowNull: false },
        token: { type: DataTypes.STRING, allowNull: false, unique: true },
        role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'member' },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        usedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: 'OrganizationInvites',
        timestamps: true,
        indexes: [
            {
                name: 'idx_organization_invites_code',
                fields: ['code'],
            },
            {
                name: 'idx_organization_invites_org_email_used',
                fields: ['OrganizationId', 'email', 'usedAt'],
            },
        ],
    }
);

export default OrganizationInvite;
