import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const ExperienceReservation = sequelize.define('ExperienceReservation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    confirmationCode: { type: DataTypes.STRING, unique: true, allowNull: false },
    numberOfAttendees: { type: DataTypes.INTEGER, allowNull: false },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { 
        type: DataTypes.ENUM('pending', 'confirmed', 'attended', 'no-show', 'cancelled'), 
        defaultValue: 'confirmed',
        allowNull: false 
    },
    specialRequests: DataTypes.TEXT,
    dayOfPhone: { type: DataTypes.STRING, allowNull: true },
    billingEmail: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
    billingName: { type: DataTypes.STRING, allowNull: false },
    billingAddress: { type: DataTypes.STRING, allowNull: true },
    billingCity: { type: DataTypes.STRING, allowNull: true },
    billingState: { type: DataTypes.STRING, allowNull: true },
    billingPostalCode: { type: DataTypes.STRING, allowNull: true },
    hotelName: { type: DataTypes.STRING, allowNull: true },
    comments: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'ExperienceReservations',
    timestamps: true,
});

ExperienceReservation.addHook('beforeCreate', async (reservation, options) => {
            const ScheduledExperience = sequelize.models.ScheduledExperience;
            const scheduledExperience = await ScheduledExperience.findByPk(
                reservation.ScheduledExperienceId,
                {
                    transaction: options.transaction,
                    lock: options.transaction?.LOCK?.UPDATE,
                }
            );

            if (!scheduledExperience) {
                throw new Error('Scheduled experience not found');
            }

            if (scheduledExperience.availableSpots < reservation.numberOfAttendees) {
                throw new Error(
                    `Not enough available spots. Requested: ${reservation.numberOfAttendees}, Available: ${scheduledExperience.availableSpots}`
                );
            }

            // Prevent booking for cancelled experiences
            if (scheduledExperience.status === 'cancelled') {
                throw new Error('Cannot book a cancelled experience');
            }

            // Prevent booking for completed experiences
            if (scheduledExperience.status === 'completed') {
                throw new Error('Cannot book a completed experience');
            }
        });
ExperienceReservation.addHook('afterCreate', async (reservation, options) => {
            const ScheduledExperience = sequelize.models.ScheduledExperience;
            const scheduledExperience = await ScheduledExperience.findByPk(
                reservation.ScheduledExperienceId,
                { transaction: options.transaction }
            );

            if (scheduledExperience) {
                await scheduledExperience.decrement(
                    'availableSpots',
                    { 
                        by: reservation.numberOfAttendees,
                        transaction: options.transaction 
                    }
                );
            }
        });
ExperienceReservation.addHook('afterUpdate', async (reservation, options) => {
            // Check if status changed to cancelled
            if (reservation.changed('status') && reservation.status === 'cancelled') {
                const ScheduledExperience = sequelize.models.ScheduledExperience;
                const scheduledExperience = await ScheduledExperience.findByPk(
                    reservation.ScheduledExperienceId,
                    { transaction: options.transaction }
                );

                if (scheduledExperience) {
                    await scheduledExperience.increment(
                        'availableSpots',
                        { 
                            by: reservation.numberOfAttendees,
                            transaction: options.transaction 
                        }
                    );
                }
            }
        });

export default ExperienceReservation;
