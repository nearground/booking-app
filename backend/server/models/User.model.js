import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            is: {
                args: /^[a-z0-9._-]+$/i,
                msg: 'Username can only contain letters, numbers, dots, underscores, and hyphens',
            },
            len: {
                args: [3, 30],
                msg: 'Username must be between 3 and 30 characters',
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
    },
    password: DataTypes.STRING,
    phoneNumber: DataTypes.STRING,
    dateOfBirth: DataTypes.DATEONLY,
    city: DataTypes.STRING,
    country: DataTypes.STRING,
    isPhoneVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    profilePicture: DataTypes.STRING,
    isRegistered: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    tableName: 'Users',
    timestamps: true,
}
);

export default User;
