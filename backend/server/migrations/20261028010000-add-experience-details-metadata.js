'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Experiences', 'detailsMetadata', {
            type: Sequelize.JSON,
            allowNull: true,
        });
    },
    async down(queryInterface) {
        await queryInterface.removeColumn('Experiences', 'detailsMetadata');
    },
};
