'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('Comments', ['UserId', 'CommentableType', 'CommentableId', 'createdAt'], {
      name: 'idx_comment_user_bookable_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Comments', 'idx_comment_user_bookable_created');
  },
};
