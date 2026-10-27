import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const ExperienceReservationAnswer = sequelize.define('ExperienceReservationAnswer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    questionKey: { type: DataTypes.STRING, allowNull: false },
    answerText: { type: DataTypes.TEXT, allowNull: true },
    answerJson: { type: DataTypes.JSON, allowNull: true },
}, {
    tableName: 'ExperienceReservationAnswers',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['ExperienceReservationId', 'questionKey'],
            name: 'unique_reservation_answer_per_question',
        },
    ],
});

export default ExperienceReservationAnswer;
