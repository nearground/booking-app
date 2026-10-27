import { defineConfig } from 'cypress';
import { execFileSync, execSync } from 'child_process';

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
        passwordResetFixture(operation) {
          if (!['read', 'expire', 'restore', 'verifyUniqueEmail'].includes(operation)) {
            throw new Error('Unsupported password-reset fixture operation');
          }
          const script = `
              import User from './server/models/User.model.js';
              import PasswordReset from './server/models/PasswordReset.model.js';
              import sequelize from './server/models/database.js';
              import bcrypt from 'bcrypt';
              if (process.env.NODE_ENV !== 'development') throw new Error('Fixture tasks require a development backend');
              sequelize.options.logging = false;
              const email = 'reset-e2e@example.invalid';
              try {
                const user = await User.findOne({ where: { email } });
                if (!user) throw new Error('Password-reset fixture has not been seeded');
                const operation = ${JSON.stringify(operation)};
                let result = null;
                if (operation === 'restore') {
                  await user.update({ password: await bcrypt.hash('testpassword', 10) });
                  await PasswordReset.destroy({ where: { email } });
                } else if (operation === 'verifyUniqueEmail') {
                  const transaction = await sequelize.transaction();
                  try {
                    await sequelize.query(
                      'INSERT INTO Users (username, email, createdAt, updatedAt) VALUES (:username, :email, NOW(), NOW())',
                      { replacements: { username: 'duplicate-reset-e2e', email: email.toUpperCase() }, transaction }
                    );
                    throw new Error('Database accepted a duplicate email');
                  } catch (error) {
                    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
                    result = true;
                  } finally {
                    await transaction.rollback();
                  }
                } else {
                  const record = await PasswordReset.findOne({ where: { email }, order: [['id', 'DESC']] });
                  if (!record) throw new Error('Reset request did not create a token');
                  if (operation === 'expire') await record.update({ expiresAt: new Date(Date.now() - 60000) });
                  const url = new URL('/reset-password', process.env.FRONTEND_BASE_URL);
                  url.searchParams.set('token', record.token);
                  result = { url: url.href, token: record.token };
                }
                console.log(JSON.stringify(result));
              } finally {
                await sequelize.close();
              }
            `;
          const output = execFileSync('docker', [
            'compose', 'exec', '-T', 'backend', 'node', '--input-type=module', '-e', script,
          ], {
            cwd: repoRoot,
            encoding: 'utf8',
            timeout: 30000,
          });
          return JSON.parse(output.trim());
        },
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
