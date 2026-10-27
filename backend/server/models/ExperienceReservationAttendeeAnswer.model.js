import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const ExperienceReservationAttendeeAnswer = sequelize.define('ExperienceReservationAttendeeAnswer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    questionKey: { type: DataTypes.STRING, allowNull: false },
    answerText: { type: DataTypes.TEXT, allowNull: true },
    answerJson: { type: DataTypes.JSON, allowNull: true },
}, {
    tableName: 'ExperienceReservationAttendeeAnswers',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['ExperienceReservationAttendeeId', 'questionKey'],
            name: 'unique_attendee_answer_per_question',
        },
    ],
});

export default ExperienceReservationAttendeeAnswer;
