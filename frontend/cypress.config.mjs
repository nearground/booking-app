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
    baseUrl: 'http://localhost:8080',
    env: {
      API_BASE_URL: 'http://localhost:8080',
    },
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      const repoRoot = config.projectRoot.replace(/[\\/]frontend$/, '');
      // Reseeding changes record IDs, so flush the dev Redis afterwards to drop stale
      // API response caches and the auth rate-limit counters that repeated logins trip.
      const flushRedis = () => {
        execSync('docker compose exec -T redis redis-cli FLUSHDB', { cwd: repoRoot, stdio: 'pipe', timeout: 30000 });
      };

      on('task', {
        seedDb() {
          try {
            execSync(
              'docker compose exec -T backend sh -c "npx sequelize db:seed:undo:all && npx sequelize db:seed:all && npm run --silent schedule:sync"',
              { cwd: repoRoot, stdio: 'pipe', timeout: 60000 }
            );
            flushRedis();
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
              'docker compose exec -T backend sh -c "npx sequelize db:migrate:undo:all && npx sequelize db:migrate && npx sequelize db:seed:all && npm run --silent schedule:sync"',
              { cwd: repoRoot, stdio: 'pipe', timeout: 60000 }
            );
            flushRedis();
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
