import { createHash } from 'node:crypto';
import { Faker, en } from '@faker-js/faker';

export const SEED_SCHEMA = Object.freeze({
    organization: { model: 'Organization', refs: {} },
    location: { model: 'Location', refs: { OrganizationId: 'organization' } },
    members: { model: 'User', refs: {} },
    membership: {
        model: 'OrganizationMembers',
        refs: { OrganizationId: 'organization', UserId: 'members' },
    },
    experiences: {
        model: 'Experience',
        refs: {
            OrganizationId: 'organization',
            LocationId: 'location',
            UserId: 'members',
        },
    },
    schedules: {
        model: 'ScheduleTemplate',
        refs: { ExperienceId: 'experiences' },
    },
    sessions: {
        model: 'ScheduledExperience',
        refs: { ExperienceId: 'experiences', ScheduleTemplateId: 'schedules' },
    },
    ticketTiers: { model: 'TicketTier', refs: { ExperienceId: 'experiences' } },
    orders: { model: 'Order', refs: { CustomerId: 'members' } },
    orderItems: {
        model: 'OrderItem',
        refs: { OrderId: 'orders', ProductId: 'experiences' },
    },
    comments: {
        model: 'Comment',
        refs: { CommentableId: 'experiences', UserId: 'members' },
    },
});

const DEFAULT_COUNTS = Object.freeze({
    members: 3,
    experiences: 2,
    sessionsPerExperience: 2,
    ticketTiersPerExperience: 2,
    orders: 2,
    commentsPerExperience: 2,
});

const FIXED_NOW = new Date('2026-10-26T12:00:00.000Z');

const hashSeed = (seed) =>
    createHash('sha256').update(String(seed)).digest().readUInt32LE(0);
const merge = (...sources) => Object.assign({}, ...sources.filter(Boolean));
const keyFor = (type, index) => `${type}-${String(index + 1).padStart(3, '0')}`;

function createRecord(type, index, attributes, refs = {}) {
    return {
        key: keyFor(type, index),
        type,
        model: SEED_SCHEMA[type].model,
        attributes,
        refs,
    };
}

export function validateSeedGraph(graph) {
    const keys = new Map(graph.records.map((record) => [record.key, record]));
    if (keys.size !== graph.records.length)
        throw new Error('Seed graph contains duplicate record keys');

    for (const record of graph.records) {
        const relation = SEED_SCHEMA[record.type];
        if (!relation) throw new Error(`Unknown record type: ${record.type}`);
        if (record.model !== relation.model) {
            throw new Error(`${record.key} must use model ${relation.model}`);
        }
        for (const field of Object.keys(record.refs)) {
            if (!Object.hasOwn(relation.refs, field)) {
                throw new Error(
                    `${record.key} has unknown reference field ${field}`
                );
            }
        }
        for (const [field, targetType] of Object.entries(relation.refs)) {
            const targetKey = record.refs[field];
            if (!targetKey || !keys.has(targetKey)) {
                throw new Error(
                    `${record.key}.${field} references missing ${targetType} record`
                );
            }
            if (keys.get(targetKey).type !== targetType) {
                throw new Error(
                    `${record.key}.${field} must reference a ${targetType} record`
                );
            }
        }
    }
    return true;
}

export function generateSeedGraph({
    seed,
    counts = {},
    traits = {},
    overrides = {},
} = {}) {
    if (seed === undefined || seed === null || String(seed).trim() === '') {
        throw new TypeError('An explicit non-empty seed is required');
    }
    const rng = new Faker({ locale: [en] });
    rng.seed(hashSeed(seed));
    const unknownCounts = Object.keys(counts).filter(
        (name) => !Object.hasOwn(DEFAULT_COUNTS, name)
    );
    if (unknownCounts.length) {
        throw new Error(
            `Unknown count setting(s): ${unknownCounts.join(', ')}`
        );
    }
    const totals = { ...DEFAULT_COUNTS, ...counts };
    for (const [name, count] of Object.entries(totals)) {
        if (!Number.isInteger(count) || count < 0 || count > 100) {
            throw new RangeError(`${name} must be an integer from 0 to 100`);
        }
    }
    if (totals.members < 1 || (totals.experiences > 0 && totals.members < 1)) {
        throw new RangeError(
            'At least one member is required for a non-empty graph'
        );
    }

    const seedLabel = createHash('sha256')
        .update(String(seed))
        .digest('hex')
        .slice(0, 10);
    const ownerId = keyFor('members', 0);
    const records = [];
    const effective = (type, base) =>
        merge(base, traits[type], overrides[type]);

    records.push(
        createRecord(
            'organization',
            0,
            effective('organization', {
                name: `${rng.company.name()} ${seedLabel}`,
                organizationUsername: `seed${seedLabel}`,
                email: `seed-${seedLabel}@example.test`,
            })
        )
    );

    records.push(
        createRecord(
            'location',
            0,
            {
                name: 'Seeded experience location',
                coordinates: {
                    type: 'Point',
                    coordinates: [-105.9367, 21.1619],
                },
                country: 'Mexico',
                state: 'Jalisco',
                city: 'Puerto Vallarta',
                street: '1 Seed Factory Way',
                zipCode: '48300',
                timezone: 'America/Mexico_City',
            },
            { OrganizationId: 'organization-001' }
        )
    );

    for (let index = 0; index < totals.members; index += 1) {
        const userKey = keyFor('members', index);
        const username = `seed.${seedLabel}.${index + 1}`;
        records.push(
            createRecord(
                'members',
                index,
                effective('member', {
                    firstName: rng.person.firstName(),
                    lastName: rng.person.lastName(),
                    username,
                    email: `${username}@example.test`,
                    phoneNumber: '+5210000000000',
                    dateOfBirth: '1990-01-15',
                    city: 'Puerto Vallarta',
                    country: 'Mexico',
                    isEmailVerified: true,
                    isRegistered: true,
                })
            )
        );
        records.push(
            createRecord(
                'membership',
                index,
                { isAdmin: index === 0 },
                {
                    OrganizationId: 'organization-001',
                    UserId: userKey,
                }
            )
        );
    }

    const experienceKeys = [];
    for (let index = 0; index < totals.experiences; index += 1) {
        const experienceKey = keyFor('experiences', index);
        experienceKeys.push(experienceKey);
        records.push(
            createRecord(
                'experiences',
                index,
                effective('experience', {
                    title: `${rng.company.buzzNoun()} experience ${index + 1}`,
                    subtitle: 'A generated demonstration experience',
                    description:
                        'Generated seed-factory content for development and test environments.',
                    capacity: 12,
                    duration: 120,
                    ratings: 4.5,
                    commentsCount: totals.commentsPerExperience,
                    images: [],
                    thumbnail: null,
                    userQuestionnary: [],
                    autoSyncEnabled: false,
                    scheduleLookaheadDays: 30,
                }),
                {
                    OrganizationId: 'organization-001',
                    LocationId: 'location-001',
                    UserId: ownerId,
                }
            )
        );

        const scheduleKey = keyFor('schedules', index);
        records.push(
            createRecord(
                'schedules',
                index,
                {
                    name: `Seed schedule ${index + 1}`,
                    type: 'recurring',
                    ruleType: 'datetime',
                    ruleCron: null,
                    ruleDateTime: new Date(
                        FIXED_NOW.getTime() + (index + 1) * 86400000
                    ).toISOString(),
                    timezone: 'America/Mexico_City',
                    durationMinutes: 120,
                    capacity: 12,
                    startDate: FIXED_NOW.toISOString(),
                    endDate: null,
                    maxOccurrences: totals.sessionsPerExperience,
                    active: true,
                },
                { ExperienceId: experienceKey }
            )
        );

        for (
            let session = 0;
            session < totals.sessionsPerExperience;
            session += 1
        ) {
            const date = new Date(
                FIXED_NOW.getTime() + (index + session + 1) * 86400000
            );
            records.push(
                createRecord(
                    'sessions',
                    index * totals.sessionsPerExperience + session,
                    {
                        dateTime: date.toISOString(),
                        endDateTime: new Date(
                            date.getTime() + 7200000
                        ).toISOString(),
                        capacity: 12,
                        availableSpots: 12,
                        status: 'scheduled',
                        syncLocked: true,
                    },
                    {
                        ExperienceId: experienceKey,
                        ScheduleTemplateId: scheduleKey,
                    }
                )
            );
        }

        for (let tier = 0; tier < totals.ticketTiersPerExperience; tier += 1) {
            records.push(
                createRecord(
                    'ticketTiers',
                    index * totals.ticketTiersPerExperience + tier,
                    effective('ticketTier', {
                        title:
                            tier === 0
                                ? 'General admission'
                                : 'Premium admission',
                        description: 'Seeded ticket tier',
                        price: tier === 0 ? '25.00' : '45.00',
                        minAge: 0,
                        maxAge: 110,
                        maxTickets: 12,
                        idType: 'standard',
                        userQuestionnary: [],
                    }),
                    { ExperienceId: experienceKey }
                )
            );
        }

        for (
            let comment = 0;
            comment < totals.commentsPerExperience;
            comment += 1
        ) {
            const memberKey = keyFor(
                'members',
                (index + comment) % totals.members
            );
            records.push(
                createRecord(
                    'comments',
                    index * totals.commentsPerExperience + comment,
                    effective('comment', {
                        CommentableType: 'Experience',
                        stars: 4 + (comment % 2),
                        title: 'Seeded traveler feedback',
                        comment: `${rng.lorem.sentence()} Generated demo feedback for this experience.`,
                        repliesCount: 0,
                        ParentId: null,
                        anonymity: 0,
                        repliesDisabled: false,
                        images: [],
                    }),
                    { CommentableId: experienceKey, UserId: memberKey }
                )
            );
        }
    }

    for (let index = 0; index < totals.orders; index += 1) {
        const experienceKey =
            experienceKeys[index % Math.max(experienceKeys.length, 1)];
        if (!experienceKey) break;
        const orderKey = keyFor('orders', index);
        const customerKey = keyFor('members', (index + 1) % totals.members);
        records.push(
            createRecord(
                'orders',
                index,
                effective('order', {
                    status: 'draft',
                    orderNumber: `SEED-${seedLabel}-${String(index + 1).padStart(4, '0')}`,
                    currency: 'USD',
                    subtotalAmount: '25.00',
                    taxAmount: '0.00',
                    discountAmount: '0.00',
                    totalAmount: '25.00',
                    paymentReference: null,
                    paymentMethod: null,
                    mainContactName: 'Seed Traveler',
                    mainContactPhone: '+5210000000000',
                    mainContactEmail: `traveler-${seedLabel}-${index + 1}@example.test`,
                    metadata: { seedKey: seedLabel },
                }),
                { CustomerId: customerKey }
            )
        );
        records.push(
            createRecord(
                'orderItems',
                index,
                {
                    ProductType: 'Experience',
                    description: 'Generated experience order item',
                    unitPrice: '25.00',
                    quantity: 1,
                    totalPrice: '25.00',
                    metadata: {
                        ticketTierKey:
                            totals.ticketTiersPerExperience > 0
                                ? keyFor(
                                      'ticketTiers',
                                      (index %
                                          totals.ticketTiersPerExperience) +
                                          1
                                  )
                                : null,
                    },
                },
                { OrderId: orderKey, ProductId: experienceKey }
            )
        );
    }

    const graph = {
        seed: String(seed),
        seedKey: seedLabel,
        generatedAt: FIXED_NOW.toISOString(),
        counts: totals,
        schema: SEED_SCHEMA,
        records,
    };
    validateSeedGraph(graph);
    return graph;
}

export async function materializeSeedGraph(
    graph,
    store,
    { mode = 'skip' } = {}
) {
    if (
        !store ||
        typeof store.transaction !== 'function' ||
        typeof store.findSeed !== 'function' ||
        typeof store.deleteSeed !== 'function' ||
        typeof store.insert !== 'function' ||
        typeof store.saveSeed !== 'function'
    ) {
        throw new TypeError(
            'Store must implement transaction, findSeed, deleteSeed, and insert'
        );
    }
    if (!['skip', 'replace'].includes(mode)) {
        throw new Error(`Unsupported seed materialization mode: ${mode}`);
    }
    validateSeedGraph(graph);
    return store.transaction(async (transaction) => {
        const existing = await store.findSeed(graph.seedKey, transaction);
        if (existing && mode === 'skip') return { ...existing, skipped: true };
        if (existing && mode !== 'replace')
            throw new Error(`Seed ${graph.seedKey} already exists`);
        if (existing) await store.deleteSeed(graph.seedKey, transaction);
        const persisted = new Map();
        for (const record of graph.records) {
            const attributes = { ...record.attributes };
            for (const [field, ref] of Object.entries(record.refs)) {
                const target = persisted.get(ref);
                if (!target)
                    throw new Error(
                        `Unresolved dependency ${ref} for ${record.key}`
                    );
                attributes[field] = target.id;
            }
            const row = await store.insert(record.model, attributes, {
                key: record.key,
                seedKey: graph.seedKey,
                transaction,
            });
            persisted.set(record.key, row);
        }
        const manifest = {
            seedKey: graph.seedKey,
            records: Array.from(persisted.values()),
        };
        await store.saveSeed(graph.seedKey, manifest, transaction);
        return { ...manifest, skipped: false };
    });
}

export async function cleanupSeedGraph(seedKey, store) {
    if (
        !store ||
        typeof store.transaction !== 'function' ||
        typeof store.deleteSeed !== 'function'
    ) {
        throw new TypeError('Store must implement transaction and deleteSeed');
    }
    return store.transaction((transaction) =>
        store.deleteSeed(String(seedKey), transaction)
    );
}
