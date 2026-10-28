import { normalizeDetailsMetadata, validateEventConfiguration } from '../../server/utils/experience-details-metadata.js';
import { transformExperience } from '../../server/services/Experience.service.js';
const migration = require('../../server/migrations/20261028010000-add-experience-details-metadata.js');
const eventTemplateMigration = require('../../server/migrations/20261028030000-rename-party-template-to-event.js');

jest.mock('../../server/models/Experience.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/models/Location.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/utils/media-storage.js', () => ({
    resolveMediaUrl: (key) => key ? `/api/media/object/${key}` : null,
}));

describe('experience details metadata contract', () => {
    test('event configuration accepts exactly one concrete date and free or paid tiers', () => {
        expect(validateEventConfiguration({
            picks: [{ dateTime: '2027-01-01T18:00:00Z' }], tiers: [{ price: '0.00' }],
        }).errors).toEqual([]);
        expect(validateEventConfiguration({
            picks: [{ dateTime: '2027-01-01T18:00:00Z' }], tiers: [{ price: '25.00' }],
        }).errors).toEqual([]);
    });

    test.each([
        { templates: [{ ruleType: 'cron', ruleCron: '* * * * *' }], tiers: [{ price: 0 }] },
        { picks: [{ dateTime: '2027-01-01T18:00:00Z' }, { dateTime: '2027-02-01T18:00:00Z' }], tiers: [{ price: 0 }] },
        { picks: [{ dateTime: '2027-01-01T18:00:00Z' }], tiers: [] },
    ])('event configuration rejects recurring/multiple dates or absent tiers %j', (configuration) => {
        expect(validateEventConfiguration(configuration).errors.length).toBeGreaterThan(0);
    });
    test('public projection strips unsupported metadata rather than exposing it', () => {
        const result = transformExperience({ toJSON: () => ({
            id: 1, title: 'Party', detailsMetadata: {
                version: 1, template: 'event', overrides: { attendees: [{ email: 'private@example.test' }] },
            },
        }) });
        expect(result.detailsMetadata).toEqual({ version: 1, template: 'default', overrides: {} });
        expect(result.detailsMedia).toEqual({ heroVideoUrl: null, heroPosterUrl: null });
    });

    test('public projection resolves only validated uploaded keys', () => {
        const result = transformExperience({ toJSON: () => ({
            id: 1, title: 'Tour', detailsMetadata: { version: 1, template: 'food-tour', overrides: {
                heroVideoKey: 'users/1/asset/123-abc.mp4',
            } },
        }) });
        expect(result.detailsMedia.heroVideoUrl).toBe('/api/media/object/users/1/asset/123-abc.mp4');
    });
    test('migration adds a nullable JSON field and can roll back', async () => {
        const queryInterface = { addColumn: jest.fn(), removeColumn: jest.fn() };
        await migration.up(queryInterface, { JSON: 'JSON' });
        expect(queryInterface.addColumn).toHaveBeenCalledWith('Experiences', 'detailsMetadata', {
            type: 'JSON', allowNull: true,
        });
        await migration.down(queryInterface);
        expect(queryInterface.removeColumn).toHaveBeenCalledWith('Experiences', 'detailsMetadata');
    });
    test('template rename migrates existing rows and can roll back', async () => {
        const queryInterface = { sequelize: { query: jest.fn() } };
        await eventTemplateMigration.up(queryInterface);
        expect(queryInterface.sequelize.query.mock.calls[0][0]).toContain("'party'");
        expect(queryInterface.sequelize.query.mock.calls[0][0]).toContain("'event'");
        await eventTemplateMigration.down(queryInterface);
        expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(2);
        expect(queryInterface.sequelize.query.mock.calls[1][0]).toContain("SET detailsMetadata");
    });
    test.each([undefined, null])('legacy %s uses the default template', (value) => {
        expect(normalizeDetailsMetadata(value)).toEqual({
            metadata: { version: 1, template: 'default', overrides: {} }, errors: [],
        });
    });

    test('roundtrips uploaded keys and ordered pinned ids', () => {
        const metadata = { version: 1, template: 'food-tour', overrides: {
            heroVideoKey: 'users/1/asset/123-abc.mp4',
            heroPosterKey: 'users/1/asset/123-abc.jpg',
            pinnedCommentIds: [9, 2, 4],
        } };
        expect(normalizeDetailsMetadata(metadata)).toEqual({ metadata, errors: [] });
    });
    test('normalizes legacy party metadata to the event template', () => {
        expect(normalizeDetailsMetadata({ version: 1, template: 'party', overrides: {} }))
            .toEqual({ metadata: { version: 1, template: 'event', overrides: {} }, errors: [] });
    });
    test('roundtrips editable template copy', () => {
        const metadata = { version: 1, template: 'event', overrides: {
            copy: { paidBadge: 'Tickets from $25', storyHeading: 'The celebration' },
        } };
        expect(normalizeDetailsMetadata(metadata)).toEqual({ metadata, errors: [] });
    });

    test.each([
        { version: 2, template: 'event' },
        { version: 1, template: 'unknown' },
        { version: 1, template: 'event', css: 'body{}' },
        { version: 1, template: 'event', overrides: { attendees: [{ email: 'private@example.test' }] } },
        { version: 1, template: 'food-tour', overrides: { heroVideoKey: 'https://evil.test/video.mp4' } },
        { version: 1, template: 'food-tour', overrides: { heroVideoKey: 'users/1/asset/../secret.mp4' } },
        { version: 1, template: 'food-tour', overrides: { heroPosterKey: 'users/1/asset/file.svg' } },
        { version: 1, template: 'food-tour', overrides: { pinnedCommentIds: [1, 1] } },
        { version: 1, template: 'food-tour', overrides: { pinnedCommentIds: [1, 2, 3, 4] } },
        { version: 1, template: 'event', overrides: [] },
        { version: 1, template: 'event', overrides: { copy: { invalid: 'text' } } },
        { version: 1, template: 'event', overrides: { copy: { storyHeading: 'x'.repeat(501) } } },
    ])('rejects unsafe/unsupported input %j', (value) => {
        const result = normalizeDetailsMetadata(value);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.metadata.template).toBe('default');
    });
});
