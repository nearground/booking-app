const { execFileSync } = require('node:child_process');
const path = require('node:path');

module.exports = (queryInterface, scenario, action) => {
    if (queryInterface && (
        queryInterface.sequelize.config.database !== process.env.MYSQL_DATABASE ||
        queryInterface.sequelize.config.host !== process.env.MYSQL_HOST
    )) {
        throw new Error('Seeder CLI target differs from the factory environment');
    }
    execFileSync(process.execPath, [path.join(__dirname, 'seed.js'), action, scenario], { stdio: 'inherit' });
};
