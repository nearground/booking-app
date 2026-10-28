import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = randomBytes(5).toString('hex');
const database = `seed_factory_test_${id}`;
const api = `pv-seed-api-${id}`;
const frontend = `pv-seed-web-${id}`;
const redis = `pv-seed-redis-${id}`;
const mysql = `pv-seed-db-${id}`;
const r2 = `pv-seed-r2-${id}`;
const sqlOnly = process.argv[2] === '--sql';
const docker = (args, options = {}) => {
    const output = execFileSync('docker', args, {
        cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options,
    });
    return options.stdio === 'inherit' ? '' : output.trim();
};
const inspect = (container) => JSON.parse(docker(['inspect', container]))[0];
const composeId = (service) => docker(['compose', 'ps', '-q', service]);
const databaseService = composeId('database');
const backendService = composeId('backend');
const frontendService = composeId('frontend');
const redisService = composeId('redis');
const r2Service = composeId('r2-local');
if (![databaseService, backendService, frontendService, redisService, r2Service].every(Boolean)) throw new Error('Start the development Docker stack first');
const network = Object.keys(inspect(backendService).NetworkSettings.Networks)[0];
const dependencies = (container) => {
    const mount = inspect(container).Mounts.find(({ Destination }) => Destination === '/app/node_modules');
    return mount?.Name || mount?.Source;
};
const backendDependencies = dependencies(backendService);
const frontendDependencies = dependencies(frontendService);
const r2Dependencies = dependencies(r2Service);
if (!backendDependencies || !frontendDependencies || !r2Dependencies) throw new Error('Running application containers must have their dependency mounts');
const adminPassword = randomBytes(24).toString('hex');
const databasePassword = randomBytes(24).toString('hex');
const r2Token = randomBytes(32).toString('hex');
const started = [];
let failure;
const waitFor = async (url) => {
    for (let attempt = 0; attempt < 90; attempt += 1) {
        try {
            await new Promise((resolve, reject) => {
                const request = http.get(url, (response) => {
                    response.resume();
                    if (response.statusCode === 200) resolve();
                    else reject(new Error(`Readiness status ${response.statusCode}`));
                });
                request.setTimeout(2000, () => request.destroy(new Error('Readiness request timed out')));
                request.on('error', reject);
            });
            return;
        } catch (error) {
            if (attempt === 89) throw new Error(`Test service did not become ready: ${url}`, { cause: error });
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Test service did not become ready: ${url}`);
};
const publishedPort = (name, containerPort) => inspect(name).NetworkSettings.Ports[`${containerPort}/tcp`][0].HostPort;

try {
    docker(['run', '-d', '--name', mysql, '--network', network,
        '-e', `MYSQL_DATABASE=${database}`, '-e', 'MYSQL_USER=seed_test',
        '-e', `MYSQL_PASSWORD=${databasePassword}`, '-e', `MYSQL_ROOT_PASSWORD=${databasePassword}`,
        inspect(databaseService).Config.Image]);
    started.push(mysql);
    let mysqlReady = false;
    for (let attempt = 0; attempt < 90; attempt += 1) {
        try {
            docker(['exec', mysql, 'sh', '-c', 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT 1"']);
            mysqlReady = true;
            break;
        } catch (error) {
            if (attempt === 89) throw new Error('Isolated MySQL did not become ready', { cause: error });
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    if (!mysqlReady) throw new Error('Isolated MySQL is not ready');
    docker(['run', '-d', '--name', redis, '--network', network, inspect(redisService).Config.Image, 'redis-server', '--save', '', '--appendonly', 'no']);
    started.push(redis);
    docker(['compose', 'run', '-d', '--no-deps', '--name', r2,
        '-v', `${r2Dependencies}:/app/node_modules`,
        '-v', `${path.join(root, 'frontend', 'public')}:/demo-assets:ro`,
        '-e', `R2_DEV_TOKEN=${r2Token}`,
        'r2-local', './node_modules/.bin/wrangler', 'dev', '--local',
        '--ip', '0.0.0.0', '--port', '8787', '--persist-to', '/tmp/pv-seed-r2-state',
        '--var', `R2_DEV_TOKEN:${r2Token}`]);
    started.push(r2);
    let storageReady = false;
    for (let attempt = 0; attempt < 90; attempt += 1) {
        try {
            docker(['exec', r2, 'node', '-e', "fetch('http://127.0.0.1:8787/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]);
            storageReady = true;
            break;
        } catch (error) {
            if (attempt === 89) throw new Error('Isolated R2 worker did not become ready', { cause: error });
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    if (!storageReady) throw new Error('Isolated R2 worker is not ready');
    const backendOptions = [
        '-v', `${backendDependencies}:/app/node_modules`,
        '-e', `MYSQL_DATABASE=${database}`, '-e', 'MYSQL_USER=seed_test', '-e', `MYSQL_PASSWORD=${databasePassword}`, '-e', `MYSQL_HOST=${mysql}`,
        '-e', 'SEED_FACTORY_ENABLED=true', '-e', `SEED_DATABASE=${database}`,
        '-e', 'SEED_TEST_RESET=true', '-e', 'SEED_DEMO_PASSWORD=testpassword',
        '-e', 'SEED_ADMIN_EMAIL=admin@martinllc.com', '-e', `SEED_ADMIN_PASSWORD=${adminPassword}`,
        '-e', `REDIS_URL=redis://${redis}:6379`, '-e', 'NOTIFICATIONS_PROVIDER=console', '-e', 'MCP_CHAT_ENABLED=false',
        '-e', `R2_WORKER_BASE_URL=http://${r2}:8787`, '-e', `R2_DEV_TOKEN=${r2Token}`,
        '-e', 'SHOWCASE_MEDIA_ASSETS_DIR=/demo-assets',
        '-v', `${path.join(root, 'frontend', 'public')}:/demo-assets:ro`,
    ];
    if (sqlOnly) {
        docker(['compose', 'run', '--rm', '--no-deps', ...backendOptions,
            '-v', `${path.join(root, 'frontend', 'public', 'video')}:/seed-media:ro`,
            '-e', 'SEED_TEST_VIDEO_FILE=/seed-media/tacos-hero.mp4', '-e', 'NODE_ENV=test',
            'backend', 'node', '--test', 'tests/seed-factory/sql-lifecycle.test.mjs'], { stdio: 'inherit' });
    } else {
    docker(['compose', 'run', '-d', '--no-deps', '--name', api,
        '--publish', '127.0.0.1::4000', ...backendOptions, 'backend', 'node', './server/bin/www']);
    started.push(api);
    const apiPort = publishedPort(api, 4000);
    await waitFor(`http://127.0.0.1:${apiPort}/`);
    docker(['compose', 'run', '-d', '--no-deps', '--name', frontend,
        '--publish', '127.0.0.1::3000', '-v', `${frontendDependencies}:/app/node_modules`,
        '-e', `API_PROXY_TARGET=http://${api}:4000`, 'frontend']);
    started.push(frontend);
    const port = publishedPort(frontend, 3000);
    const base = `http://localhost:${port}`;
    await waitFor(base);
    console.log(`Isolated browser environment ready: ${base}; database ${database}`);
    const specs = process.argv[2] || 'cypress/e2e/booking/**/*.cy.js,cypress/e2e/auth/password-reset.cy.js,cypress/e2e/responsive/**/*.cy.js';
    execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
        '--no-install', 'cypress', 'run', '--config', `baseUrl=${base}`,
        '--env', `API_BASE_URL=${base}`, '--spec', specs,
    ], {
        cwd: path.join(root, 'frontend'), stdio: 'inherit',
        env: { ...process.env, CYPRESS_SEED_BACKEND_CONTAINER: api },
        shell: process.platform === 'win32',
    });
    }
} catch (error) {
    failure = error;
    for (const name of started.filter((name) => name !== redis && name !== mysql)) {
        console.error(docker(['logs', '--tail', '30', name]));
    }
} finally {
    const cleanupErrors = [];
    for (const name of started.reverse()) {
        try { docker(['rm', '-f', '-v', name]); } catch (error) { cleanupErrors.push(error); }
    }
    if (cleanupErrors.length) throw new AggregateError([...(failure ? [failure] : []), ...cleanupErrors], 'Isolated browser run/cleanup failed');
}
if (failure) throw failure;
