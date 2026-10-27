import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { validateApiOrigin } from '../../server/mcp/server.js';

const entrypoint = fileURLToPath(
    new URL('../../server/mcp/index.js', import.meta.url)
);
const secret = 'fixture-private-value';
const publicExperience = {
    id: 42,
    experienceCode: 42,
    title: 'Ocean walk',
    description: 'Explore the coast',
    city: 'Puerto Vallarta',
    price: '25.00',
    images: [
        {
            imageUrl: '/ocean.jpg',
            accessibleText: 'Ocean',
            credentials: secret,
        },
    ],
    Location: {
        name: 'Beach',
        city: 'Puerto Vallarta',
        timezone: 'America/Mexico_City',
        owner: { email: secret },
    },
    TicketTiers: [
        {
            id: 3,
            title: 'Adult',
            price: '25.00',
            userQuestionnary: [secret],
            token: secret,
        },
    ],
    Organizers: [{ email: secret, phoneNumber: secret }],
    organizers: [
        {
            contact: { email: secret },
            organizerAllComments: [{ user: { email: secret } }],
        },
    ],
    comments: [{ User: { password: secret } }],
    userQuestionnary: [secret],
    credentials: { password: secret },
};
const paging = { currentPage: 2, totalPages: 3, pageSize: 6, secret };
const requests = [];
let redirectedRequests = 0;
let fixture;
let redirectTarget;
let origin;
let client;
let transport;
let stderr = '';

before(async () => {
    redirectTarget = createServer((_req, res) => {
        redirectedRequests += 1;
        res.end('{}');
    });
    redirectTarget.listen(0, '127.0.0.1');
    await once(redirectTarget, 'listening');
    fixture = createServer((req, res) => {
        requests.push({
            method: req.method,
            url: req.url,
            headers: req.headers,
        });
        const url = new URL(req.url, origin);
        res.setHeader('content-type', 'application/json');
        const send = (body) => res.end(JSON.stringify(body));
        if (url.pathname === '/api/experiences') {
            return send({
                errors: [],
                data: { elements: [publicExperience], private: secret },
                paging,
                metadata: { totalResults: 18, secret },
            });
        }
        if (url.pathname === '/api/experiences/42/schedule') {
            return send({
                elements: [
                    {
                        id: 91,
                        dateTime: '2026-11-01T18:00:00.000Z',
                        endDateTime: null,
                        availableSpots: 4,
                        capacity: 10,
                        status: 'scheduled',
                        syncLocked: true,
                        Reservations: [{ mainContact: { phone: secret } }],
                    },
                ],
                paging: { ...paging, pageSize: 10 },
                metadata: {
                    totalResults: 18,
                    timezone: 'America/Mexico_City',
                    secret,
                },
            });
        }
        switch (url.pathname) {
            case '/api/experiences/42':
                return send({
                    errors: [],
                    data: publicExperience,
                    diagnostics: secret,
                });
            case '/api/experiences/500':
                res.statusCode = 500;
                return send({ message: secret, upstream: origin });
            case '/api/experiences/501':
                return res.end(`not-json: ${secret}`);
            case '/api/experiences/502':
                return send({ errors: [secret], data: {} });
            case '/api/experiences/503':
                return send({ data: { id: 42, title: { password: secret } } });
            case '/api/experiences/509':
                return send({ errors: [secret], data: publicExperience });
            case '/api/experiences/504':
                res.writeHead(302, { location: `${origin}/redirected` });
                return res.end();
            case '/api/experiences/505':
                res.writeHead(302, {
                    location: `http://127.0.0.1:${redirectTarget.address().port}/private`,
                });
                return res.end();
            case '/api/experiences/506':
                res.setHeader('content-length', 2 * 1024 * 1024);
                return res.end('oversized');
            case '/api/experiences/507':
                res.write(' '.repeat(600000));
                return res.end(' '.repeat(600000));
            case '/api/experiences/508':
                // Leave the body pending to verify the timeout covers streaming too.
                res.write('{"data":');
                return;
            default:
                res.statusCode = 404;
                return send({ message: secret });
        }
    });
    fixture.listen(0, '127.0.0.1');
    await once(fixture, 'listening');
    origin = `http://127.0.0.1:${fixture.address().port}`;
    // A real local stdio client: no database or external API is needed.
    transport = new StdioClientTransport({
        command: process.execPath,
        args: [entrypoint],
        env: { BOOKING_API_BASE_URL: origin },
        stderr: 'pipe',
    });
    transport.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });
    client = new Client({
        name: 'booking-local-smoke-client',
        version: '1.0.0',
    });
    await client.connect(transport);
});

after(async () => {
    if (client) await client.close();
    for (const server of [fixture, redirectTarget]) {
        if (!server) continue;
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    }
});

const call = (name, args) => client.callTool({ name, arguments: args });
const value = (result) => {
    assert.notEqual(result.isError, true);
    assert.equal(result.content[0].type, 'text');
    assert.ok(!JSON.stringify(result).includes(secret));
    return JSON.parse(result.content[0].text);
};

test('initializes a real stdio server and lists only the three public tools', async () => {
    assert.equal(client.getServerVersion().name, 'booking-public-experiences');
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
        'get_experience',
        'list_experience_dates',
        'search_experiences',
    ]);
    const dates = tools.find((tool) => tool.name === 'list_experience_dates');
    assert.match(dates.description, /synchronization/);
    assert.equal(dates.annotations.readOnlyHint, undefined);
    assert.equal(dates.annotations.idempotentHint, undefined);
});

test('search preserves list envelopes, encodes city, and redacts nested models', async () => {
    const result = value(
        await call('search_experiences', {
            city: 'Puerto Vallarta & beach',
            currentPage: 2,
        })
    );
    assert.equal(result.data.elements[0].title, 'Ocean walk');
    assert.deepEqual(result.paging, {
        currentPage: 2,
        totalPages: 3,
        pageSize: 6,
    });
    assert.deepEqual(result.metadata, { totalResults: 18 });
    const request = requests.at(-1);
    const url = new URL(request.url, origin);
    assert.equal(url.pathname, '/api/experiences');
    assert.equal(url.searchParams.get('city'), 'Puerto Vallarta & beach');
    assert.equal(url.searchParams.get('currentPage'), '2');
    assert.equal(request.method, 'GET');
    assert.equal(request.headers.cookie, undefined);
    assert.equal(request.headers.authorization, undefined);
});

test('search city is optional and page defaults to one', async () => {
    value(await call('search_experiences', {}));
    assert.equal(requests.at(-1).url, '/api/experiences?currentPage=1');
});

test('detail retains useful public fields but not contacts, comments or questionnaire data', async () => {
    const result = value(await call('get_experience', { experienceCode: 42 }));
    assert.equal(requests.at(-1).url, '/api/experiences/42');
    assert.deepEqual(result, {
        data: {
            id: 42,
            experienceCode: 42,
            title: 'Ocean walk',
            description: 'Explore the coast',
            city: 'Puerto Vallarta',
            price: '25.00',
            images: [{ imageUrl: '/ocean.jpg', accessibleText: 'Ocean' }],
            Location: {
                name: 'Beach',
                city: 'Puerto Vallarta',
                timezone: 'America/Mexico_City',
            },
            TicketTiers: [{ id: 3, title: 'Adult', price: '25.00' }],
        },
    });
});

test('dates honor schedule elements/paging/metadata shape and query parameters', async () => {
    const result = value(
        await call('list_experience_dates', {
            experienceCode: 42,
            currentPage: 2,
            pageSize: 10,
            startDate: '2026-11-01',
        })
    );
    assert.equal(
        requests.at(-1).url,
        '/api/experiences/42/schedule?currentPage=2&pageSize=10&startDate=2026-11-01'
    );
    assert.deepEqual(result.elements, [
        {
            id: 91,
            dateTime: '2026-11-01T18:00:00.000Z',
            endDateTime: null,
            capacity: 10,
            availableSpots: 4,
            status: 'scheduled',
        },
    ]);
    assert.equal(result.metadata.timezone, 'America/Mexico_City');
    assert.deepEqual(result.paging, {
        currentPage: 2,
        totalPages: 3,
        pageSize: 10,
    });
    value(await call('list_experience_dates', { experienceCode: 42 }));
    assert.equal(
        requests.at(-1).url,
        '/api/experiences/42/schedule?currentPage=1&pageSize=6'
    );
});

test('invalid inputs never reach REST or escape into management and other origins', async () => {
    const count = requests.length;
    for (const experienceCode of [
        'manage',
        '../manage',
        '42',
        `${origin}/private`,
        0,
        -1,
        1.5,
        2147483648,
    ]) {
        assert.equal(
            (await call('get_experience', { experienceCode })).isError,
            true
        );
    }
    for (const args of [
        { experienceCode: 42, pageSize: 101 },
        { experienceCode: 42, currentPage: 0 },
        { experienceCode: 42, startDate: '2026-02-30' },
        { experienceCode: 42, startDate: '../manage' },
    ]) {
        assert.equal((await call('list_experience_dates', args)).isError, true);
    }
    for (const args of [
        { currentPage: 10001 },
        { city: '' },
        { city: 'x'.repeat(101) },
        { url: 'https://other.invalid' },
    ]) {
        assert.equal((await call('search_experiences', args)).isError, true);
    }
    assert.equal(requests.length, count);
});

for (const [code, label] of [
    [500, 'HTTP errors'],
    [501, 'malformed JSON'],
    [502, 'error envelopes'],
    [503, 'unexpected nested values'],
    [509, 'error envelopes with partial data'],
    [504, 'same-origin redirects'],
    [505, 'cross-origin redirects'],
    [506, 'oversized content-length'],
    [507, 'oversized streamed body'],
    [999, 'not found'],
]) {
    test(`${label} produce generic tool errors without retries or diagnostics`, async () => {
        const count = requests.length;
        const result = await call('get_experience', { experienceCode: code });
        assert.equal(result.isError, true);
        assert.deepEqual(result.content, [
            {
                type: 'text',
                text: 'Unable to retrieve public experience information.',
            },
        ]);
        assert.equal(requests.length, count + 1);
        assert.equal(redirectedRequests, 0);
    });
}

test(
    'a stalled response body is aborted within the fixed request timeout',
    { timeout: 10000 },
    async () => {
        const started = Date.now();
        const result = await call('get_experience', { experienceCode: 508 });
        assert.equal(result.isError, true);
        assert.ok(Date.now() - started < 9000);
        assert.ok(!JSON.stringify(result).includes(origin));
    }
);

test('trusted configuration accepts only http(s) origins without credentials or URL components', () => {
    assert.equal(
        validateApiOrigin('http://localhost:4000'),
        'http://localhost:4000'
    );
    assert.equal(
        validateApiOrigin('https://example.invalid/'),
        'https://example.invalid'
    );
    for (const input of [
        'file:///etc/passwd',
        'ftp://example.invalid',
        'http://user@example.invalid',
        'http://@example.invalid',
        'http://example.invalid/..',
        'http:\\\\example.invalid',
        'http://example.invalid/api',
        'http://example.invalid/?key=secret',
        'http://example.invalid/#secret',
        'http://example.invalid/?',
        'http://example.invalid/#',
        'not-a-url',
    ]) {
        assert.throws(() => validateApiOrigin(input));
    }
});

test(
    'invalid startup configuration exits safely with no stdout or sensitive error',
    { timeout: 10000 },
    async (t) => {
        const child = spawn(process.execPath, [entrypoint], {
            env: {
                ...process.env,
                BOOKING_API_BASE_URL: `http://user:${secret}@localhost:4000`,
            },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        t.after(() => {
            child.stdin.destroy();
            if (child.exitCode === null) child.kill();
        });
        let stdout = '';
        let error = '';
        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            error += chunk.toString();
        });
        child.stdin.end();
        const [code] = await once(child, 'close');
        assert.equal(code, 1);
        assert.equal(stdout, '');
        assert.equal(error, 'Unable to start booking MCP server.\n');
        assert.equal(stderr, '');
    }
);
