import { defineConfig } from 'cypress';
import { execSync } from 'child_process';

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },

  e2e: {
    baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      on('task', {
        seedDb() {
          try {
            execSync(
              'docker compose exec -T backend sh -c "npx sequelize db:seed:undo:all && npx sequelize db:seed:all"',
              { cwd: config.projectRoot.replace(/[\\/]frontend$/, ''), stdio: 'pipe', timeout: 60000 }
            );
          } catch (error) {
            console.error(`Failed to seed database: ${error.message}. Ensure the backend container is running and the database is accessible.`);
            if (error.stdout) {
              console.error(error.stdout.toString());
            }
            if (error.stderr) {
              console.error(error.stderr.toString());
            }
            throw error;
          }
          return null;
        },
        resetDb() {
          try {
            execSync(
              'docker compose exec -T backend sh -c "npx sequelize db:migrate:undo:all && npx sequelize db:migrate && npx sequelize db:seed:all"',
              { cwd: config.projectRoot.replace(/[\\/]frontend$/, ''), stdio: 'pipe', timeout: 60000 }
            );
          } catch (error) {
            console.error(`Failed to reset database: ${error.message}. Ensure the backend container is running and migrations are available.`);
            if (error.stdout) {
              console.error(error.stdout.toString());
            }
            if (error.stderr) {
              console.error(error.stderr.toString());
            }
            throw error;
          }
          return null;
        },
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
