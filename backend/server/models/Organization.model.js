import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const Organization = sequelize.define('Organization', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: {
        type: DataTypes.STRING,
        unique: {
            msg: 'Organization name must be unique',
        },
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Organization name is required',
            },
        },
    },
    organizationUsername: {
        type: DataTypes.STRING,
        unique: {
            msg: 'Organization username must be unique',
        },
        allowNull: false,
        validate: {
            is: {
                args: /^[a-z0-9]+$/,
                msg: 'Organization username can only contain lowercase letters and numbers',
            },
            len: {
                args: [3, 30],
                msg: 'Organization username must be between 3 and 30 characters',
            },
        },
    },
    email: { 
        type: DataTypes.STRING, 
        allowNull: false,
        validate: {
            isEmail: {
                msg: 'Must be a valid email address'
            }
        }
    }
}, {
    tableName: 'Organizations',
    timestamps: true,
});

export default Organization;
