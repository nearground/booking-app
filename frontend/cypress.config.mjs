import { defineConfig } from 'cypress';
import { execFileSync } from 'child_process';

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
      const backendArgs = process.env.CYPRESS_SEED_BACKEND_CONTAINER
        ? ['exec', '-i', process.env.CYPRESS_SEED_BACKEND_CONTAINER]
        : ['compose', 'exec', '-T', 'backend'];
      const runBackend = (script) => execFileSync('docker', [
        ...backendArgs, 'node', '--input-type=module', '-e', script,
      ], { cwd: repoRoot, encoding: 'utf8', timeout: 120000 });
      const seedTestDatabase = () => {
        runBackend(`
          import db from './server/models/index.js';
          import redis from './server/utils/ioredis-client.js';
          import { resetSeedTestDatabase } from './server/seed-factory/test-database.js';
          import { runSeedScenario } from './server/seed-factory/runner.js';
          db.sequelize.options.logging = false;
          try {
            await resetSeedTestDatabase(db);
            await runSeedScenario(db, { scenario: 'startup' });
            await runSeedScenario(db, { scenario: 'demo' });
            await redis.flushdb();
          } finally {
            await db.sequelize.close();
            redis.disconnect();
          }
        `);
        return null;
      };

      on('task', {
        seedCatalog() {
          return JSON.parse(runBackend(`
            import { demoCatalog } from './server/seed-factory/catalog.js';
            console.log(JSON.stringify({
              seededExperiences: demoCatalog.map(({ title, duration, capacity, prices }) => ({
                title, durationMinutes: duration, capacity,
                tiers: prices.map((price, i) => ({ title: ['Adult', 'Adult', 'Student', 'Child'][i], price })),
              })),
            }));
          `));
        },
        passwordResetFixture(operation) {
          if (!['read', 'expire', 'restore', 'verifyUniqueEmail'].includes(operation)) {
            throw new Error('Unsupported password-reset fixture operation');
          }
          const script = `
              import User from './server/models/User.model.js';
              import PasswordReset from './server/models/PasswordReset.model.js';
              import sequelize from './server/models/database.js';
              import bcrypt from 'bcrypt';
              import { assertSeedEnvironment } from './server/seed-factory/store.js';
              assertSeedEnvironment(sequelize);
              if (!/^seed_factory_test_[a-z0-9_]+$/.test(sequelize.config.database)) throw new Error('Fixture tasks require an isolated seed database');
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
          const output = runBackend(script);
          return JSON.parse(output.trim().split('\n').at(-1));
        },
        seedDb: seedTestDatabase,
        resetDb: seedTestDatabase,
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
