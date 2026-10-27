'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        for (const column of [
            'billingEmail',
            'billingAddress',
            'billingCity',
            'billingState',
            'billingPostalCode',
        ]) {
            await queryInterface.changeColumn(
                'ExperienceReservations',
                column,
                {
                    type: Sequelize.STRING,
                    allowNull: true,
                }
            );
        }
    },

    async down(queryInterface, Sequelize) {
        const fallbackValues = {
            billingEmail: 'manual-registration@invalid.local',
            billingAddress: 'Not provided',
            billingCity: 'Not provided',
            billingState: 'Not provided',
            billingPostalCode: 'Not provided',
        };
        for (const [column, value] of Object.entries(fallbackValues)) {
            await queryInterface.bulkUpdate(
                'ExperienceReservations',
                { [column]: value },
                { [column]: null }
            );
        }

        for (const column of [
            'billingEmail',
            'billingAddress',
            'billingCity',
            'billingState',
            'billingPostalCode',
        ]) {
            await queryInterface.changeColumn(
                'ExperienceReservations',
                column,
                {
                    type: Sequelize.STRING,
                    allowNull: false,
                }
            );
        }
    },
};
