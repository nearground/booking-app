import { describe, expect, test } from '@jest/globals';
import { generateScenario, buildScenario } from '../../server/seed-factory/scenarios.js';
import { assertSeedEnvironment } from '../../server/seed-factory/store.js';
import { generateSeedGraph, validateSeedGraph } from '../../server/seed-factory/index.js';

const options = {
    scenario: 'demo', clock: '2026-10-27',
    passwordHash: '$2b$10$mrRYiTpW5hXrqqd0Pds9Wu7YtfBpN7ZukE.AkuZscpKqX5BBuEu.a',
};

describe('durable seed scenarios', () => {
    test('same seed and clock produce identical complete demo graphs', () => {
        const graph = generateScenario(options);
        expect(graph).toEqual(generateScenario(options));
        const byModel = (model) => graph.records.filter((row) => row.model === model);
        expect(byModel('Organization')).toHaveLength(3);
        expect(byModel('Location')).toHaveLength(7);
        expect(byModel('User')).toHaveLength(25);
        expect(byModel('Organizer')).toHaveLength(22);
        expect(byModel('Experience')).toHaveLength(4);
        expect(byModel('TicketTier')).toHaveLength(16);
        expect(byModel('Comment')).toHaveLength(602);
        expect(byModel('User').find(({ attributes }) => attributes.username === 'reset-e2e').attributes.email).toBe('reset-e2e@example.invalid');
        expect(byModel('ScheduledExperience').length).toBeGreaterThan(300);
        expect(byModel('ScheduledExperience').every(({ attributes }) => new Date(attributes.dateTime) > new Date(options.clock))).toBe(true);
        expect(byModel('Experience').every(({ attributes }) => attributes.autoSyncEnabled === false)).toBe(true);
        expect(byModel('TicketTier').slice(0, 4).map(({ attributes }) => attributes.price)).toEqual(['69.99', '54.99', '39.99', '24.99']);
    });
    test('startup uses explicit credentials and links headquarters/membership', () => {
        const graph = generateScenario({ ...options, scenario: 'startup', adminEmail: ' ADMIN@example.invalid ' });
        expect(graph.records.find(({ model }) => model === 'User').attributes.email).toBe('admin@example.invalid');
        expect(graph.links).toEqual([{ key: 'org-0', refs: { LocationId: 'location-0' } }]);
        expect(() => generateScenario({ ...options, scenario: 'startup' })).toThrow('administrator email');
    });
    test('fails explicitly on missing/weak configuration and invalid dates', async () => {
        await expect(buildScenario({ ...options, env: {} })).rejects.toThrow('SEED_DEMO_PASSWORD');
        expect(() => generateScenario({ ...options, clock: 'bad' })).toThrow('clock');
        expect(() => generateScenario({ ...options, scenario: 'other' })).toThrow('Scenario');
    });
    test('requires explicit environment and exact database acknowledgement', () => {
        const db = { config: { database: 'seed_test' } };
        expect(() => assertSeedEnvironment(db, { NODE_ENV: 'production', SEED_FACTORY_ENABLED: 'true', SEED_DATABASE: 'seed_test' })).toThrow('development/test');
        expect(() => assertSeedEnvironment(db, { NODE_ENV: 'test' })).toThrow('SEED_DATABASE');
        expect(() => assertSeedEnvironment(db, { NODE_ENV: 'test', SEED_FACTORY_ENABLED: 'true', SEED_DATABASE: 'other' })).toThrow('SEED_DATABASE');
        expect(() => assertSeedEnvironment(db, { NODE_ENV: 'test', SEED_FACTORY_ENABLED: 'true', SEED_DATABASE: 'seed_test' })).not.toThrow();
    });
    test('rejects unsafe model, field references and automatic scheduling', () => {
        const graph = generateSeedGraph({ seed: 'unsafe' });
        const experience = graph.records.find(({ model }) => model === 'Experience');
        experience.attributes.OrganizationId = 999;
        expect(() => validateSeedGraph(graph)).toThrow('as a reference');
        delete experience.attributes.OrganizationId;
        experience.attributes.autoSyncEnabled = true;
        expect(() => validateSeedGraph(graph)).toThrow('automatic schedule');
    });
});
