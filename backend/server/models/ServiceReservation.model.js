import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const ServiceReservation = sequelize.define('ServiceReservation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    confirmationCode: { type: DataTypes.STRING, unique: true, allowNull: false },
    numberOfAttendees: { type: DataTypes.INTEGER, allowNull: false },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'attended', 'no-show', 'cancelled'),
        defaultValue: 'confirmed',
        allowNull: false,
    },
    specialRequests: DataTypes.TEXT,
    attendeeNames: DataTypes.JSON,
    billingEmail: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
    billingName: { type: DataTypes.STRING, allowNull: false },
    billingAddress: { type: DataTypes.STRING, allowNull: false },
    billingCity: { type: DataTypes.STRING, allowNull: false },
    billingState: { type: DataTypes.STRING, allowNull: false },
    billingPostalCode: { type: DataTypes.STRING, allowNull: false },
}, {
    tableName: 'ServiceReservations',
    timestamps: true,
});

ServiceReservation.addHook('beforeCreate', async (reservation, options) => {
    const ScheduledService = sequelize.models.ScheduledService;
    const scheduledService = await ScheduledService.findByPk(
        reservation.ScheduledServiceId,
        { transaction: options.transaction }
    );

    if (!scheduledService) {
        throw new Error('Scheduled service not found');
    }

    if (scheduledService.availableSpots < reservation.numberOfAttendees) {
        throw new Error(
            `Not enough available spots. Requested: ${reservation.numberOfAttendees}, Available: ${scheduledService.availableSpots}`
        );
    }

    if (scheduledService.status === 'cancelled') {
        throw new Error('Cannot book a cancelled service');
    }

    if (scheduledService.status === 'completed') {
        throw new Error('Cannot book a completed service');
    }
});

ServiceReservation.addHook('afterCreate', async (reservation, options) => {
    const ScheduledService = sequelize.models.ScheduledService;
    const scheduledService = await ScheduledService.findByPk(
        reservation.ScheduledServiceId,
        { transaction: options.transaction }
    );

    if (scheduledService) {
        await scheduledService.decrement('availableSpots', {
            by: reservation.numberOfAttendees,
            transaction: options.transaction,
        });
    }
});

ServiceReservation.addHook('afterUpdate', async (reservation, options) => {
    if (reservation.changed('status') && reservation.status === 'cancelled') {
        const ScheduledService = sequelize.models.ScheduledService;
        const scheduledService = await ScheduledService.findByPk(
            reservation.ScheduledServiceId,
            { transaction: options.transaction }
        );

        if (scheduledService) {
            await scheduledService.increment('availableSpots', {
                by: reservation.numberOfAttendees,
                transaction: options.transaction,
            });
        }
    }
});

export default ServiceReservation;
