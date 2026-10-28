import { assertSeedEnvironment } from './store.js';
import { createSequelizeSeedStore } from './store.js';
import { drainSeedMedia } from './runner.js';

export async function resetSeedTestDatabase(db, env = process.env) {
    assertSeedEnvironment(db.sequelize, env);
    if (env.SEED_TEST_RESET !== 'true' || !/^seed_factory_test_[a-z0-9_]+$/.test(db.sequelize.config.database)) {
        throw new Error('Reset requires SEED_TEST_RESET=true and an isolated seed_factory_test_* database');
    }
    const store = createSequelizeSeedStore(db, { env });
    await store.initialize();
    await store.Asset.update({ state: 'delete' }, { where: {} });
    await drainSeedMedia(store, { env });
    await db.sequelize.sync({ force: true });
}
