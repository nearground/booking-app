import { describe, expect, jest, test } from '@jest/globals';
import { createServer as createHttpServer } from 'node:http';
import { createChatService, createMcpClient } from '../../server/services/Chat.service.js';

describe('chat service', () => {
    test('uses the public MCP experience tools to answer visitor questions', async () => {
        const responses = [
            {
                content: '',
                tool_calls: [{
                    name: 'search_experiences',
                    args: { city: 'Puerto Vallarta', currentPage: 1 },
                    id: 'tool-call-1',
                }],
            },
            { content: 'I found a boat tour in Puerto Vallarta.', tool_calls: [] },
        ];
        const invoke = jest.fn()
            .mockResolvedValueOnce(responses[0])
            .mockResolvedValueOnce(responses[1]);
        const bindTools = jest.fn(() => ({ invoke }));
        const modelFactory = jest.fn(() => ({ bindTools }));
        const client = {
            callTool: jest.fn().mockResolvedValue({
                content: [{ type: 'text', text: '{"experiences":["boat tour"]}' }],
            }),
        };
        const service = createChatService({
            modelFactory,
            clientFactory: jest.fn().mockResolvedValue(client),
        });

        await expect(service([{ role: 'user', content: 'Find me a boat tour' }]))
            .resolves.toBe('I found a boat tour in Puerto Vallarta.');

        const registeredTools = bindTools.mock.calls[0][0];
        expect(registeredTools.map(({ name }) => name)).toEqual([
            'search_experiences',
            'get_experience',
            'list_experience_dates',
        ]);
        expect(client.callTool).toHaveBeenCalledWith({
            name: 'search_experiences',
            arguments: { city: 'Puerto Vallarta', currentPage: 1 },
        });
        expect(invoke).toHaveBeenCalledTimes(2);
        expect(invoke.mock.calls[1][0][3].tool_call_id).toBe('tool-call-1');
        expect(invoke.mock.calls[1][0][3].content).toContain('boat tour');
    });

    test('rejects empty responses from the configured model', async () => {
        const service = createChatService({
            modelFactory: () => ({
                bindTools: () => ({ invoke: jest.fn().mockResolvedValue({ content: '', tool_calls: [] }) }),
            }),
            clientFactory: jest.fn().mockResolvedValue({ callTool: jest.fn() }),
        });

        await expect(service([{ role: 'user', content: 'Hello' }]))
            .rejects.toThrow('The chat model returned an empty response');
    });

    test('does not initialize the MCP client when model credentials are missing', async () => {
        const clientFactory = jest.fn();
        const service = createChatService({
            modelFactory: () => {
                throw Object.assign(new Error('Chat model is not configured'), { status: 503 });
            },
            clientFactory,
        });

        await expect(service([{ role: 'user', content: 'Hello' }]))
            .rejects.toMatchObject({ status: 503 });
        expect(clientFactory).not.toHaveBeenCalled();
    });

    test('connects through the in-memory MCP server to the public experience API', async () => {
        const requests = [];
        const api = createHttpServer((request, response) => {
            requests.push({
                url: request.url,
                cookie: request.headers.cookie,
                authorization: request.headers.authorization,
            });
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({
                data: { elements: [] },
                paging: { currentPage: 1, totalPages: 0, pageSize: 6 },
                metadata: { totalResults: 0 },
            }));
        });
        await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve));
        const previousApiUrl = process.env.BOOKING_API_BASE_URL;
        process.env.BOOKING_API_BASE_URL = `http://127.0.0.1:${api.address().port}`;
        let client;

        try {
            client = await createMcpClient();
            const tools = await client.listTools();
            expect(tools.tools.map(({ name }) => name)).toEqual([
                'search_experiences',
                'get_experience',
                'list_experience_dates',
            ]);

            const result = await client.callTool({
                name: 'search_experiences',
                arguments: { city: 'Puerto Vallarta' },
            });

            expect(result.isError).not.toBe(true);
            expect(JSON.parse(result.content[0].text).data.elements).toEqual([]);
            expect(requests).toEqual([{
                url: '/api/experiences?city=Puerto+Vallarta&currentPage=1',
                cookie: undefined,
                authorization: undefined,
            }]);
        } finally {
            if (previousApiUrl === undefined) delete process.env.BOOKING_API_BASE_URL;
            else process.env.BOOKING_API_BASE_URL = previousApiUrl;
            if (client) await client.close();
            const apiClosed = new Promise((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
            if (typeof api.closeAllConnections === 'function') api.closeAllConnections();
            await apiClosed;
        }
    });
});
