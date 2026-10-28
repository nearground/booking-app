'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE Experiences
            SET detailsMetadata = JSON_SET(detailsMetadata, '$.template', 'event')
            WHERE JSON_UNQUOTE(JSON_EXTRACT(detailsMetadata, '$.template')) = 'party'
        `);
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE Experiences
            SET detailsMetadata = JSON_SET(detailsMetadata, '$.template', 'party')
            WHERE JSON_UNQUOTE(JSON_EXTRACT(detailsMetadata, '$.template')) = 'event'
        `);
    },
};
