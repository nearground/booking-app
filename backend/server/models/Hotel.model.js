import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const Hotel = sequelize.define('Hotel', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hotelCode: { type: DataTypes.INTEGER, unique: true, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    subtitle: DataTypes.TEXT,
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    ratings: DataTypes.DECIMAL(2, 1),
    city: { type: DataTypes.STRING(100), allowNull: false },
    images: { type: DataTypes.JSON },
    benefits: { type: DataTypes.JSON },
    comments: { type: DataTypes.JSON },
}, {
    tableName: 'Hotels',
    timestamps: true,
    indexes: [
        {
            name: 'idx_hotel_city',
            fields: ['city']
        },
        {
            name: 'idx_hotel_code',
            fields: ['hotelCode']
        }
    ]
});

export default Hotel;
