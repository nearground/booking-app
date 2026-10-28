'use strict';
const run = require('../scripts/run-seed-factory.cjs');

module.exports = {
  async up(queryInterface) { run(queryInterface, 'showcase', 'apply'); },
  async down(queryInterface) { run(queryInterface, 'showcase', 'cleanup'); },
};
