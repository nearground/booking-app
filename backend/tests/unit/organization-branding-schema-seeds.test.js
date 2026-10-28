import { describe, expect, jest, test } from '@jest/globals';
import { createRequire } from 'node:module';
import Organization from '../../server/models/Organization.model.js';
import { validateOrganizationBranding } from '../../server/utils/organization-branding.js';

const require = createRequire(import.meta.url);
const Sequelize = require('sequelize');
const baseline = require('../../server/migrations/20260305120000-create-baseline-schema.js');
const organizationSchema = require('../../server/migrations/20260417130000-add-organization-username.js');
import { generateScenario } from '../../server/seed-factory/scenarios.js';

const brandingFields = ['slug', 'logoMediaKey', 'coverMediaKey', 'coverMediaType', 'primaryColor', 'accentColor', 'font', 'tagline', 'about', 'socialLinks', 'contactLinks', 'layoutTemplate'];

describe('initial organization branding schema', () => {
  test('existing migrations define every model branding column and the unique slug index', async () => {
    const tables = {};
    const indexes = [];
    const queryInterface = {
      createTable: jest.fn(async (table, fields) => { tables[table] = { ...fields }; }),
      addColumn: jest.fn(async (table, field, definition) => { tables[table][field] = definition; }),
      changeColumn: jest.fn(async (table, field, definition) => { tables[table][field] = definition; }),
      addIndex: jest.fn(async (table, fields, options) => { indexes.push({ table, fields, ...options }); }),
      addConstraint: jest.fn(), bulkUpdate: jest.fn(),
      sequelize: { query: jest.fn().mockResolvedValue([[], {}]) },
    };
    await baseline.up(queryInterface, Sequelize);
    await organizationSchema.up(queryInterface, Sequelize);
    for (const field of brandingFields) {
      const migrated = tables.Organizations[field];
      const modeled = Organization.rawAttributes[field];
      expect(migrated).toBeDefined();
      expect(migrated.allowNull).toBe(modeled.allowNull);
      expect(Organization.sequelize.normalizeDataType(migrated.type).toSql()).toBe(modeled.type.toSql());
      if (!['about', 'socialLinks', 'contactLinks', 'slug'].includes(field)) expect(migrated.defaultValue).toEqual(modeled.defaultValue);
    }
    expect(indexes).toContainEqual({ table: 'Organizations', fields: ['slug'], name: 'uq_organizations_slug', unique: true });
    expect(Organization.rawAttributes.slug.unique.name).toBe('uq_organizations_slug');
    expect(queryInterface.bulkUpdate).toHaveBeenCalledWith('Organizations', { about: '' }, { about: null });
    expect(queryInterface.bulkUpdate).toHaveBeenCalledWith('Organizations', { socialLinks: '{}' }, { socialLinks: null });
    expect(queryInterface.bulkUpdate).toHaveBeenCalledWith('Organizations', { contactLinks: '{}' }, { contactLinks: null });
  });

  test('rollback removes branding columns and both organization indexes', async () => {
    const queryInterface = { removeColumn: jest.fn(), removeIndex: jest.fn().mockResolvedValue(undefined) };
    await organizationSchema.down(queryInterface);
    for (const field of [...brandingFields, 'organizationUsername']) expect(queryInterface.removeColumn).toHaveBeenCalledWith('Organizations', field);
    expect(queryInterface.removeIndex).toHaveBeenCalledWith('Organizations', 'uq_organizations_slug');
    expect(queryInterface.removeIndex).toHaveBeenCalledWith('Organizations', 'organizations_org_username_unique');
  });
});

describe('branded organization demo seeds', () => {
  test.each([
    ['startup', ['martinllc'], ['classic']],
    ['demo', ['testcompany1', 'testcompany2', 'testcompany3'], ['classic', 'editorial', 'immersive']],
  ])('%s organization inserts contain valid, complete branding', async (scenario, slugs, templates) => {
    const graph = generateScenario({
      scenario, clock: '2026-10-27', adminEmail: 'admin@example.invalid',
      passwordHash: '$2b$10$mrRYiTpW5hXrqqd0Pds9Wu7YtfBpN7ZukE.AkuZscpKqX5BBuEu.a',
    });
    const organizations = graph.records.filter(({ model }) => model === 'Organization').map(({ attributes }) => attributes);
    expect(organizations.map((org) => org.slug)).toEqual(slugs);
    expect(organizations.map((org) => org.layoutTemplate)).toEqual(templates);
    for (const organization of organizations) {
      const branding = organization;
      expect(validateOrganizationBranding(branding)).toBeNull();
      expect(organization.logoMediaKey).toBeNull();
      expect(organization.coverMediaKey).toBeNull();
      expect(organization.tagline.length).toBeGreaterThan(0);
      expect(organization.about.length).toBeGreaterThan(0);
      expect(Object.keys(branding.socialLinks).length).toBeGreaterThan(0);
      expect(Object.keys(branding.contactLinks).length).toBeGreaterThan(0);
      const modeled = Organization.build(branding);
      await expect(modeled.validate()).resolves.toBe(modeled);
    }
  });
});
