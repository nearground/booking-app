import { readFile } from 'node:fs/promises';
import db from '../models/index.js';
import { runSeedScenario } from '../seed-factory/runner.js';
import redis from '../utils/ioredis-client.js';

async function main() {
  try {
    const [action = 'preview', scenario = 'demo', ...args] = process.argv.slice(2);
    const options = {};
    for (const arg of args) {
        const match = /^--(mode|seed|clock|media)=(.+)$/.exec(arg);
        if (!match) throw new Error(`Unknown seed option: ${arg}`);
        options[match[1]] = match[2];
    }
    const media = options.media ? JSON.parse(await readFile(options.media, 'utf8')) : [];
    if (!Array.isArray(media)) throw new Error('Media input must be an array');
    db.sequelize.options.logging = false;
    const result = await runSeedScenario(db, {
        ...options, media, action, scenario,
        onCleanupPlan: (plan) => process.stderr.write(`${JSON.stringify({ action: 'cleanup-plan', ...plan })}\n`),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
    process.stderr.write(`Seed factory failed: ${error.stack || error}\n`);
    process.exitCode = 1;
} finally {
    await db.sequelize.close();
    redis.disconnect();
}
}
main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
});
