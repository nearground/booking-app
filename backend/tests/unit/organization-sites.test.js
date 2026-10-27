import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Op } = require('sequelize');
import { createOrganizationSlug, isValidHttpsUrl, isValidOrganizationSlug, validateOrganizationBranding } from '../../server/utils/organization-branding.js';
import { buildPublicOrganizationSitePayload } from '../../server/utils/organization-site-response.js';
import sequelize from '../../server/models/database.js';
import { requireOrganizationAdmin } from '../../server/middlewares/organization-auth.js';
import organizationSitesRouter, { getPublicOrganizationSite } from '../../server/routes/organization-sites.js';

const makeResponse = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('organization site slug validation', () => {
  test.each(['www', 'api', 'admin', 'internal', 'app', 'mail', 'static', 'assets', 'docs'])('%s is reserved', (slug) => {
    expect(isValidOrganizationSlug(slug)).toBe(false);
  });
  test.each(['pv-adventures', 'abc', 'a123'])('%s is a valid DNS-safe slug', (slug) => expect(isValidOrganizationSlug(slug)).toBe(true));
  test.each(['UPPER', '-leading', 'trailing-', 'two words', 'a', 'double--hyphen'])('%s is invalid', (slug) => expect(isValidOrganizationSlug(slug)).toBe(false));
  test('derives a safe default slug from organizationUsername', () => {
    expect(createOrganizationSlug('Admin')).toBe('org-admin');
    expect(createOrganizationSlug('PV123')).toBe('pv123');
  });
  test('Organization model derives its default slug from organizationUsername', async () => {
    const organization = sequelize.models.Organization.build({ name: 'A sample org', organizationUsername: 'admin', email: 'admin@example.com' });
    await organization.validate();
    expect(organization.slug).toBe('org-admin');
  });
});

describe('branding validation', () => {
  test('accepts supported values and valid HTTPS links', () => {
    expect(validateOrganizationBranding({
      slug: 'pv-adventures', primaryColor: '#Aa12fF', accentColor: '#123456', font: 'inter', layoutTemplate: 'editorial',
      socialLinks: { instagram: 'https://instagram.com/pv' }, contactLinks: { email: 'hello@example.com', website: 'https://example.com' },
    })).toBeNull();
  });
  test.each([
    [{ slug: 'api' }, 'Slug is invalid or reserved'],
    [{ primaryColor: 'red' }, 'primaryColor must be a hex color'],
    [{ font: 'Comic Sans' }, 'Font is not supported'],
    [{ layoutTemplate: 'custom' }, 'Layout template is not supported'],
    [{ socialLinks: { instagram: 'javascript:alert(1)' } }, 'Social links must use HTTPS'],
    [{ socialLinks: { other: 'https://example.com' } }, 'Unsupported Social key: other'],
    [{ contactLinks: { email: 'bad' } }, 'Contact email must be valid'],
    [{ coverMediaType: 'html' }, 'Cover media type is not supported'],
    [{ coverMediaType: 'video', coverMediaKey: 'users/1/organization-cover/cover.jpg' }, 'Video covers must reference an MP4 upload'],
    [{ logoMediaKey: 'users/1/organization-logo/logo.mp4' }, 'Logo must reference uploaded image media'],
  ])('rejects invalid branding payloads', (input, message) => expect(validateOrganizationBranding(input)).toBe(message));
  test('only accepts secure URLs', () => {
    expect(isValidHttpsUrl('https://example.com')).toBe(true);
    expect(isValidHttpsUrl('http://example.com')).toBe(false);
    expect(isValidHttpsUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('public site response privacy', () => {
  test('projects only public organization and experience fields and marks sold-out sessions', () => {
    const result = buildPublicOrganizationSitePayload({
      id: 8, name: 'PV Adventures', slug: 'pv-adventures', email: 'private@example.com', organizationUsername: 'pvadventures',
      OrganizationMembers: [{ UserId: 5, isAdmin: true }], primaryColor: '#123456',
      Experiences: [{ id: 42, title: 'Sunset boat', description: 'Cruise', UserId: 5,
        ExperienceReservations: [{ id: 7, customerEmail: 'private@example.com' }],
        ScheduledExperiences: [{ dateTime: '2030-01-01T10:00:00Z', availableSpots: 0 }] }],
    });
    expect(result.organization).toMatchObject({ id: 8, name: 'PV Adventures', slug: 'pv-adventures', primaryColor: '#123456' });
    expect(result.experiences[0]).toMatchObject({ id: 42, title: 'Sunset boat', soldOut: true, url: 'https://puertovallarta.today/experience/42' });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('OrganizationMembers');
    expect(serialized).not.toContain('ExperienceReservations');
    expect(serialized).not.toContain('organizationUsername');
  });

  test('site read query includes only scheduled future occurrences and explicit public fields', async () => {
    const organization = sequelize.models.Organization;
    jest.spyOn(organization, 'findOne').mockResolvedValue({ toJSON: () => ({ id: 1, name: 'Org', slug: 'org-site', Experiences: [] }) });
    const res = makeResponse();
    await getPublicOrganizationSite({ params: { slug: 'org-site' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ experiences: [] }) }));
    const query = organization.findOne.mock.calls[0][0];
    expect(query.attributes).toContain('slug');
    expect(query.attributes).not.toContain('email');
    expect(query.include[0].required).toBe(false);
    expect(query.include[0].include[0].required).toBe(true);
    expect(query.include[0].attributes).toEqual(['id', 'title', 'subtitle', 'description', 'thumbnail', 'duration']);
    expect(query.include[0].include[0].where.status).toBe('scheduled');
    expect(query.include[0].include[0].where.dateTime[Op.gte]).toBeInstanceOf(Date);
  });
});

describe('organization branding admin authorization', () => {
  afterEach(() => jest.restoreAllMocks());
  test('non-admin organization members cannot proceed to write handlers', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ isAdmin: false });
    const req = { user: { id: 3 }, params: { organizationId: '4' }, body: {} };
    const res = makeResponse(); const next = jest.fn();
    await requireOrganizationAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  test('admin write route is protected by authentication and organization-admin middleware', () => {
    const patchRoute = organizationSitesRouter.stack.find((layer) => layer.route?.path === '/admin/:organizationId/branding' && layer.route.methods.patch);
    expect(patchRoute.route.stack.map((layer) => layer.handle.name)).toEqual(expect.arrayContaining(['authUser', 'requireOrganizationAdmin', 'updateOrganizationBranding']));
  });
});
