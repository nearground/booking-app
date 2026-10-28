import { describe, expect, test } from '@jest/globals';
import { generateScenario, scenarioSeedKey } from '../../server/seed-factory/scenarios.js';
import { materializeSeedGraph, validateSeedGraph } from '../../server/seed-factory/index.js';

const passwordHash = '$2b$10$mrRYiTpW5hXrqqd0Pds9Wu7YtfBpN7ZukE.AkuZscpKqX5BBuEu.a';
const clock = '2026-10-27';
const options = { scenario: 'showcase', seed: 'showcase-fixture', clock, passwordHash };
const byType = (graph, type) => graph.records.filter((record) => record.type === type);

describe('additive experience showcase scenario', () => {
    test('keeps the generic demo intact and builds three separately-owned showcase organizations', () => {
        const demo = generateScenario({ ...options, scenario: 'demo' });
        const showcase = generateScenario(options);
        const organizations = byType(showcase, 'organization');

        expect(byType(demo, 'organization').map(({ attributes }) => attributes.slug))
            .toEqual(['testcompany1', 'testcompany2', 'testcompany3']);
        expect(byType(demo, 'experiences')).toHaveLength(4);
        expect(organizations.map(({ attributes }) => attributes.slug))
            .toEqual(['house-party', 'food-tours', 'default-tours']);
        expect(showcase.records.some(({ attributes }) => attributes?.slug?.startsWith('testcompany'))).toBe(false);
        expect(showcase.seedKey).not.toBe(demo.seedKey);
        expect(validateSeedGraph(showcase)).toBe(true);

        const experienceOrgs = byType(showcase, 'experiences').map(({ refs }) => refs.OrganizationId);
        expect(new Set(experienceOrgs)).toEqual(new Set(organizations.map(({ key }) => key)));
        expect(byType(showcase, 'members').every(({ attributes }) => attributes.password === passwordHash)).toBe(true);
        for (const experience of byType(showcase, 'experiences')) {
            expect(experience.attributes.detailsMetadata.version).toBe(1);
            expect(experience.attributes.detailsMetadata.template).toMatch(/^(default|event|food-tour)$/);
            expect(experience.attributes.detailsMetadata.overrides.copy).toBeDefined();
        }
    });

    test('event examples use one 20:00 Mexico City session, free or paid tickets, and opted-in registered guests', () => {
        const graph = generateScenario(options);
        const records = graph.records;
        const events = byType(graph, 'experiences').filter(({ attributes }) => attributes.detailsMetadata.template === 'event');

        expect(events.map(({ attributes }) => attributes.title)).toEqual(['Private Rooftop Party', 'Bar Special Night']);
        for (const [eventIndex, event] of events.entries()) {
            const session = records.find(({ type, refs }) => type === 'pickedSessions' && refs.ExperienceId === event.key);
            expect(session).toBeDefined();
            expect(new Intl.DateTimeFormat('en-GB', {
                timeZone: 'America/Mexico_City', hour: '2-digit', hour12: false,
            }).format(new Date(session.attributes.dateTime))).toBe('20');
            expect(records.filter(({ type, refs }) => type === 'schedules' && refs.ExperienceId === event.key)).toHaveLength(0);
            expect(records.filter(({ type, refs }) => type === 'ticketTiers' && refs.ExperienceId === event.key)
                .map(({ attributes }) => attributes.price)).toEqual([eventIndex === 0 ? '0.00' : '250.00']);
            expect(event.attributes.userQuestionnary).toContainEqual(expect.objectContaining({
                questionKey: 'publicAttendance', type: 'boolean', required: false,
            }));
            const reservations = records.filter(({ type, refs }) => type === 'experienceReservations' && refs.ScheduledExperienceId === session.key);
            expect(reservations).toHaveLength(3);
            expect(reservations.every(({ attributes }) => attributes.status === 'attended' &&
                attributes.totalPrice === (eventIndex === 0 ? '0.00' : '250.00'))).toBe(true);
            expect(session.attributes.availableSpots).toBe(event.attributes.capacity - 3);
            expect(reservations.every(({ refs }) => records.find(({ key }) => key === refs.CustomerId).attributes.isRegistered)).toBe(true);
            const answers = records.filter(({ type, refs }) => type === 'reservationAnswers' && reservations.some(({ key }) => key === refs.ExperienceReservationId));
            expect(answers).toHaveLength(3);
            expect(answers.every(({ attributes }) => attributes.questionKey === 'publicAttendance' && attributes.answerText === 'true')).toBe(true);
        }
    });

    test('food and default tours are bookable with paid tickets and recurring future sessions', () => {
        const graph = generateScenario(options);
        const food = byType(graph, 'experiences').find(({ attributes }) => attributes.detailsMetadata.template === 'food-tour');
        const defaults = byType(graph, 'experiences').find(({ attributes }) => attributes.detailsMetadata.template === 'default');
        const foodReviews = byType(graph, 'comments').filter(({ refs }) => refs.CommentableId === food.key);
        const now = new Date(`${clock}T00:00:00.000Z`);
        expect(food.attributes.title).toBe('Old Town Taco Tour');
        expect(foodReviews).toHaveLength(3);
        expect(foodReviews.every(({ attributes }) => attributes.stars === 5)).toBe(true);
        expect(food.attributes.ratings).toBe('5.00');
        expect(food.attributes.detailsMetadata.overrides.copy).toEqual(expect.objectContaining({
            heroEyebrow: 'A taste of old town Vallarta',
            reviewsHeading: 'Stories from the table',
        }));
        expect(food.attributes.images).toEqual([]);
        expect(defaults.attributes.title).toBe('Los Arcos Coastal Sightseeing Tour');
        expect(defaults.attributes.detailsMetadata.overrides.copy.galleryLabel).toBe('Explore coastal tour photos');
        expect(defaults.attributes.images).toEqual([]);
        for (const [experience, prices] of [[food, ['59.99', '44.99', '32.99', '17.99']], [defaults, ['64.99', '49.99', '34.99', '19.99']]]) {
            const tiers = byType(graph, 'ticketTiers').filter(({ refs }) => refs.ExperienceId === experience.key);
            expect(tiers.map(({ attributes }) => attributes.price)).toEqual(prices);
            expect(tiers.every(({ attributes }) => Number(attributes.price) > 0)).toBe(true);
            const schedule = byType(graph, 'schedules').find(({ refs }) => refs.ExperienceId === experience.key);
            expect(schedule.attributes.ruleCron).toBe('0 9,13,17 * * 1,3,5');
            const sessions = byType(graph, 'sessions').filter(({ refs }) => refs.ExperienceId === experience.key);
            expect(sessions.length).toBeGreaterThanOrEqual(35);
            expect(sessions.every(({ attributes }) => {
                const date = new Date(attributes.dateTime);
                return date > now && date <= new Date(now.getTime() + 90 * 86400000);
            })).toBe(true);
            expect(sessions.every(({ attributes }) => attributes.availableSpots === experience.attributes.capacity)).toBe(true);
        }
        expect(scenarioSeedKey('showcase', 'showcase-fixture')).toBe(graph.seedKey);
    });

    test('materializes reservations and answers through owned graph references', async () => {
        const graph = generateScenario(options);
        const stored = [];
        let nextId = 1;
        const store = {
            transaction: (callback) => callback({}),
            findSeed: async () => null,
            deleteSeed: async () => false,
            insert: async (model, attributes, { key }) => {
                const row = { key, model, id: nextId++, attributes: { ...attributes }, where: { id: nextId - 1 } };
                stored.push(row);
                return row;
            },
            update: async (record, attributes) => {
                Object.assign(record.attributes, attributes);
            },
            saveSeed: async () => {},
        };
        await materializeSeedGraph(graph, store);
        const storedByKey = new Map(stored.map((record) => [record.key, record]));
        for (const reservation of byType(graph, 'experienceReservations')) {
            const persisted = storedByKey.get(reservation.key);
            expect(persisted.attributes.ScheduledExperienceId)
                .toBe(storedByKey.get(reservation.refs.ScheduledExperienceId).id);
            expect(persisted.attributes.CustomerId)
                .toBe(storedByKey.get(reservation.refs.CustomerId).id);
            const answer = byType(graph, 'reservationAnswers').find(({ refs }) => refs.ExperienceReservationId === reservation.key);
            expect(storedByKey.get(answer.key).attributes.ExperienceReservationId).toBe(persisted.id);
        }
    });
});
