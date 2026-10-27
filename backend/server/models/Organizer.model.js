import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const Organizer = sequelize.define('Organizer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    UserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    tableName: 'Organizers',
    timestamps: true,
}
);

const assertUniqueOrganizerUserId = async (organizerInstance) => {
    const existingOrganizer = await Organizer.findOne({
        where: { UserId: organizerInstance.UserId },
        attributes: ['id'],
    });

    if (existingOrganizer && existingOrganizer.id !== organizerInstance.id) {
        throw new Error('Organizer profile already exists for this user');
    }
};

Organizer.addHook('beforeCreate', async (organizerInstance) => {
    await assertUniqueOrganizerUserId(organizerInstance);
});

Organizer.addHook('beforeUpdate', async (organizerInstance) => {
    await assertUniqueOrganizerUserId(organizerInstance);
});

export default Organizer;
