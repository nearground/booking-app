import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const HotelReservation = sequelize.define('HotelReservation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    confirmationCode: { type: DataTypes.STRING, unique: true, allowNull: false },
    checkInDate: { type: DataTypes.DATEONLY, allowNull: false },
    checkOutDate: { type: DataTypes.DATEONLY, allowNull: false },
    numberOfGuests: { type: DataTypes.INTEGER, allowNull: false },
    numberOfRooms: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { 
        type: DataTypes.ENUM('pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'), 
        defaultValue: 'confirmed',
        allowNull: false 
    },
    specialRequests: DataTypes.TEXT,
    guestNames: DataTypes.JSON, // Array of guest names
}, {
    tableName: 'HotelReservations',
    timestamps: true,
    validate: {
        checkOutAfterCheckIn() {
            if (this.checkOutDate <= this.checkInDate) {
                throw new Error('Check-out date must be after check-in date');
            }
        }
    }
});

export default HotelReservation;
