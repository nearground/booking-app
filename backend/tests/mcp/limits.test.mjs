import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../server/mcp/server.js';

async function setup(t, respond, limits) {
    const fixture = createHttpServer(respond);
    t.after(async () => {
        fixture.closeAllConnections();
        await new Promise((resolve) => fixture.close(resolve));
    });
    fixture.listen(0, '127.0.0.1');
    await once(fixture, 'listening');
    const apiBaseUrl = `http://127.0.0.1:${fixture.address().port}`;
    const server = createServer({ apiBaseUrl, ...limits });
    const client = new Client({ name: 'boundary-test', version: '1.0.0' });
    t.after(async () => {
        await client.close();
        await server.close();
    });
    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return () =>
        client.callTool({
            name: 'get_experience',
            arguments: { experienceCode: 42 },
        });
}

for (const streamed of [false, true]) {
    test(
        `a one-byte allowed response limit rejects ${streamed ? 'streamed' : 'known-length'} responses safely`,
        { timeout: 5000 },
        async (t) => {
            const call = await setup(
                t,
                (_req, res) => {
                    if (streamed) res.write('{');
                    else res.setHeader('content-length', 2);
                    res.end(streamed ? '}' : '{}');
                },
                { maxResponseBytes: 1 }
            );
            const result = await call();
            assert.equal(result.isError, true);
            assert.equal(
                result.content[0].text,
                'Unable to retrieve public experience information.'
            );
        }
    );
}

for (const streamed of [false, true]) {
    test(
        `a short timeout aborts stalled ${streamed ? 'bodies' : 'headers'} and cleans up`,
        { timeout: 5000 },
        async (t) => {
            const call = await setup(
                t,
                (_req, res) => {
                    if (streamed) res.write('{"data":');
                },
                { requestTimeoutMs: 100 }
            );
            const result = await call();
            assert.equal(result.isError, true);
            assert.equal(
                result.content[0].text,
                'Unable to retrieve public experience information.'
            );
        }
    );
}

test('embedding limits may only tighten the fixed production bounds', () => {
    for (const limits of [
        { requestTimeoutMs: 0 },
        { requestTimeoutMs: 5001 },
        { requestTimeoutMs: 0.5 },
        { maxResponseBytes: 0 },
        { maxResponseBytes: 1048577 },
        { maxResponseBytes: 1.5 },
    ]) {
        assert.throws(() =>
            createServer({ apiBaseUrl: 'http://localhost:4000', ...limits })
        );
    }
});
