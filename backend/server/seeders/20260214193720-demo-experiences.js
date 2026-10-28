'use strict';
const run = require('../scripts/run-seed-factory.cjs');

module.exports = {
  async up(queryInterface) {
    run(queryInterface, 'demo', 'apply');
  },
  async down(queryInterface) {
    run(queryInterface, 'demo', 'cleanup');
  },
};
