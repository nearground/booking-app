import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const REQUEST_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const positiveInteger = z.number().int().min(1).max(2147483647);
const page = z.number().int().min(1).max(10000).default(1);
const text = z.string().nullable().optional();
const number = z.number().finite().nullable().optional();
const decimal = z
    .union([z.number().finite(), z.string()])
    .nullable()
    .optional();
const location = z
    .object({
        name: text,
        city: text,
        country: text,
        state: text,
        street: text,
        zipCode: text,
        timezone: text,
    })
    .nullable()
    .optional();
const experience = z.object({
    id: positiveInteger,
    experienceCode: positiveInteger.optional(),
    title: z.string(),
    subtitle: text,
    description: text,
    city: text,
    duration: number,
    capacity: number,
    ratings: decimal,
    price: decimal,
    thumbnail: text,
    images: z
        .array(z.object({ imageUrl: z.string(), accessibleText: text }))
        .optional(),
    Location: location,
    TicketTiers: z
        .array(
            z.object({
                id: positiveInteger,
                title: text,
                description: text,
                minAge: number,
                maxAge: number,
                price: decimal,
            })
        )
        .optional(),
});
const paging = z.object({
    currentPage: positiveInteger,
    totalPages: z.number().int().min(0),
    pageSize: positiveInteger,
});
const metadata = z.object({
    totalResults: z.number().int().min(0),
    timezone: z.string().optional(),
});
const searchResponse = z.object({
    data: z.object({ elements: z.array(experience) }),
    paging,
    metadata,
});
const detailResponse = z.object({ data: experience });
const scheduleResponse = z.object({
    elements: z.array(
        z.object({
            id: positiveInteger,
            dateTime: z.string(),
            endDateTime: text,
            capacity: number,
            availableSpots: number,
            status: z.string(),
        })
    ),
    paging,
    metadata,
});

export function validateApiOrigin(value) {
    const url = new URL(value);
    if (
        !/^https?:\/\/[^/?#\\]+\/?$/i.test(value) ||
        value.includes('@') ||
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        value.includes('?') ||
        value.includes('#')
    ) {
        throw new Error('Invalid API origin');
    }
    return url.origin;
}

async function requestJson(
    origin,
    path,
    query,
    { requestTimeoutMs, maxResponseBytes }
) {
    const url = new URL(path, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/api/experiences')) {
        throw new Error('Invalid request');
    }
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
    let reader;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'omit',
            redirect: 'error',
            signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error('Request failed');
        const contentLength = response.headers.get('content-length');
        if (contentLength && Number(contentLength) > maxResponseBytes) {
            throw new Error('Response too large');
        }
        reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maxResponseBytes) throw new Error('Response too large');
            chunks.push(Buffer.from(value));
        }
        const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (
            result?.errors &&
            (!Array.isArray(result.errors) || result.errors.length > 0)
        ) {
            throw new Error('API error');
        }
        return result;
    } finally {
        clearTimeout(timer);
        controller.abort();
        if (reader) await reader.cancel().catch(() => {});
    }
}

export function createServer({
    apiBaseUrl = process.env.BOOKING_API_BASE_URL ?? 'http://localhost:4000',
    requestTimeoutMs = REQUEST_TIMEOUT_MS,
    maxResponseBytes = MAX_RESPONSE_BYTES,
} = {}) {
    const origin = validateApiOrigin(apiBaseUrl);
    const limits = z
        .object({
            requestTimeoutMs: z.number().int().min(1).max(REQUEST_TIMEOUT_MS),
            maxResponseBytes: z.number().int().min(1).max(MAX_RESPONSE_BYTES),
        })
        .parse({ requestTimeoutMs, maxResponseBytes });
    const server = new McpServer({
        name: 'booking-public-experiences',
        version: '1.0.0',
    });
    const register = (
        name,
        description,
        inputSchema,
        outputSchema,
        path,
        query,
        annotations
    ) => {
        server.registerTool(
            name,
            { description, inputSchema, annotations },
            async (args) => {
                try {
                    // Parse again before building paths, independent of SDK validation.
                    const validated = inputSchema.parse(args);
                    const result = outputSchema.parse(
                        await requestJson(
                            origin,
                            path(validated),
                            query(validated),
                            limits
                        )
                    );
                    return {
                        content: [
                            { type: 'text', text: JSON.stringify(result) },
                        ],
                    };
                } catch {
                    return {
                        isError: true,
                        content: [
                            {
                                type: 'text',
                                text: 'Unable to retrieve public experience information.',
                            },
                        ],
                    };
                }
            }
        );
    };
    const readAnnotations = {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    };
    register(
        'search_experiences',
        'Browse public experiences, optionally by city. Results use the API fixed page size of 6.',
        z
            .object({
                city: z.string().trim().min(1).max(100).optional(),
                currentPage: page,
            })
            .strict(),
        searchResponse,
        () => '/api/experiences',
        ({ city, currentPage }) => ({ city, currentPage }),
        readAnnotations
    );
    register(
        'get_experience',
        'Get public experience details by positive integer experienceCode. Excludes organizer contacts, comments, and questionnaires.',
        z.object({ experienceCode: positiveInteger }).strict(),
        detailResponse,
        ({ experienceCode }) => `/api/experiences/${experienceCode}`,
        () => ({}),
        readAnnotations
    );
    register(
        'list_experience_dates',
        'List scheduled experience dates and availability. This public GET may trigger backend schedule synchronization when no dates exist. startDate is YYYY-MM-DD in the schedule timezone.',
        z
            .object({
                experienceCode: positiveInteger,
                currentPage: page,
                pageSize: z.number().int().min(1).max(100).default(6),
                startDate: z.iso.date().optional(),
            })
            .strict(),
        scheduleResponse,
        ({ experienceCode }) => `/api/experiences/${experienceCode}/schedule`,
        ({ currentPage, pageSize, startDate }) => ({
            currentPage,
            pageSize,
            startDate,
        }),
        { openWorldHint: true }
    );
    return server;
}
