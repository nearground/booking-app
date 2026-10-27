'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.addColumn('Comments', 'images', {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Comments', 'images');
    },
};
