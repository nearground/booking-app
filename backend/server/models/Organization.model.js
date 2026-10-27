import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';
import { createOrganizationSlug, isValidOrganizationSlug, validateOrganizationBranding } from '../utils/organization-branding.js';

const Organization = sequelize.define('Organization', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: {
        type: DataTypes.STRING,
        unique: { msg: 'Organization name must be unique' },
        allowNull: false,
        validate: { notEmpty: { msg: 'Organization name is required' } },
    },
    organizationUsername: {
        type: DataTypes.STRING,
        unique: { msg: 'Organization username must be unique' },
        allowNull: false,
        validate: {
            is: { args: /^[a-z0-9]+$/, msg: 'Organization username can only contain lowercase letters and numbers' },
            len: { args: [3, 30], msg: 'Organization username must be between 3 and 30 characters' },
        },
    },
    slug: {
        type: DataTypes.STRING(63),
        allowNull: false,
        unique: { name: 'uq_organizations_slug', msg: 'Organization site slug must be unique' },
        validate: { isOrganizationSlug(value) { if (!isValidOrganizationSlug(value)) throw new Error('Slug is invalid or reserved'); } },
    },
    logoMediaKey: { type: DataTypes.STRING(512), allowNull: true, validate: { isUploadedMedia(value) { const error = validateOrganizationBranding({ logoMediaKey: value }); if (error) throw new Error(error); } } },
    coverMediaKey: { type: DataTypes.STRING(512), allowNull: true, validate: { isUploadedMedia(value) { const error = validateOrganizationBranding({ coverMediaKey: value }); if (error) throw new Error(error); } } },
    coverMediaType: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'image', validate: { isSupportedType(value) { if (!['image', 'video'].includes(value)) throw new Error('Cover media type is not supported'); } } },
    primaryColor: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#0f766e', validate: { isHexColor(value) { if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error('primaryColor must be a hex color'); } } },
    accentColor: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#f59e0b', validate: { isHexColor(value) { if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error('accentColor must be a hex color'); } } },
    font: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'system', validate: { isSupportedFont(value) { if (!['system', 'inter', 'roboto', 'lato', 'montserrat'].includes(value)) throw new Error('Font is not supported'); } } },
    tagline: { type: DataTypes.STRING(160), allowNull: false, defaultValue: '' },
    about: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    socialLinks: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    contactLinks: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    layoutTemplate: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'classic', validate: { isSupportedTemplate(value) { if (!['classic', 'editorial', 'immersive'].includes(value)) throw new Error('Layout template is not supported'); } } },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: { msg: 'Must be a valid email address' } },
    }
}, {
    tableName: 'Organizations',
    timestamps: true,
    hooks: {
        beforeValidate(organization) {
            if (!organization.slug && organization.organizationUsername) {
                organization.slug = createOrganizationSlug(organization.organizationUsername);
            }
        },
        beforeSave(organization) {
            const error = validateOrganizationBranding(organization.get({ plain: true }));
            if (error) throw new Error(error);
        },
    },
});

export default Organization;
