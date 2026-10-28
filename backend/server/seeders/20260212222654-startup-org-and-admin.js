'use strict';
const run = require('../scripts/run-seed-factory.cjs');

module.exports = {
  async up(queryInterface) { run(queryInterface, 'startup', 'apply'); },
  async down(queryInterface) { run(queryInterface, 'startup', 'cleanup'); },
};
