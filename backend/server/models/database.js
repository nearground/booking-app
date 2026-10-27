import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { Sequelize } = require('sequelize');

import config from '../config/config.js';

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
});

export default sequelize;
