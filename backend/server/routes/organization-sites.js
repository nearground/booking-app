import { createRequire } from 'node:module';
import { Op } from 'sequelize';
import { authUser } from '../middlewares/auth.js';
import { requireOrganizationAdmin } from '../middlewares/organization-auth.js';
import modelRegistry from '../models/index.js';
import { isValidOrganizationSlug, validateOrganizationBranding } from '../utils/organization-branding.js';
import { buildPublicOrganizationSitePayload } from '../utils/organization-site-response.js';

const require = createRequire(import.meta.url);
const express = require('express');
const router = express.Router();
const { Organization, Experience, ScheduledExperience } = modelRegistry;
const BRANDING_FIELDS = ['slug', 'logoMediaKey', 'coverMediaKey', 'coverMediaType', 'primaryColor', 'accentColor', 'font', 'tagline', 'about', 'socialLinks', 'contactLinks', 'layoutTemplate'];
const PUBLIC_ORGANIZATION_FIELDS = ['id', 'name', ...BRANDING_FIELDS];

const getPublicOrganizationSite = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!isValidOrganizationSlug(slug)) return res.status(404).json({ errors: ['Organization site not found'], data: {} });
    const organization = await Organization.findOne({
      where: { slug },
      attributes: PUBLIC_ORGANIZATION_FIELDS,
      include: [{
        model: Experience,
        as: 'Experiences',
        attributes: ['id', 'title', 'subtitle', 'description', 'thumbnail', 'images', 'duration'],
        required: false,
        include: [{
          model: ScheduledExperience,
          as: 'ScheduledExperiences',
          attributes: ['dateTime', 'availableSpots'],
          where: { status: 'scheduled', dateTime: { [Op.gte]: new Date() } },
          required: true,
        }],
      }],
    });
    if (!organization) return res.status(404).json({ errors: ['Organization site not found'], data: {} });
    return res.status(200).json({ errors: [], data: buildPublicOrganizationSitePayload(organization) });
  } catch (_error) {
    return res.status(500).json({ errors: ['Unable to load organization site'], data: {} });
  }
};

const getOrganizationBranding = async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.organizationId, { attributes: PUBLIC_ORGANIZATION_FIELDS });
    if (!organization) return res.status(404).json({ errors: ['Organization not found'], data: {} });
    return res.status(200).json({ errors: [], data: organization });
  } catch (_error) {
    return res.status(500).json({ errors: ['Unable to load organization branding'], data: {} });
  }
};

const updateOrganizationBranding = async (req, res) => {
  try {
    const input = req.body || {};
    const allowed = new Set(BRANDING_FIELDS);
    const unknownField = Object.keys(input).find((field) => !allowed.has(field));
    if (unknownField) return res.status(400).json({ errors: [`Unsupported branding field: ${unknownField}`], data: {} });
    const validationError = validateOrganizationBranding(input);
    if (validationError) return res.status(400).json({ errors: [validationError], data: {} });
    for (const field of ['logoMediaKey', 'coverMediaKey']) {
      const mediaKey = input[field];
      if (mediaKey && !mediaKey.startsWith(`users/${req.user.id}/`)) {
        return res.status(400).json({ errors: ['Branding media must be uploaded by the current admin'], data: {} });
      }
    }
    const organization = await Organization.findByPk(req.organizationId);
    if (!organization) return res.status(404).json({ errors: ['Organization not found'], data: {} });
    await organization.update(input);
    return res.status(200).json({ errors: [], data: await Organization.findByPk(req.organizationId, { attributes: PUBLIC_ORGANIZATION_FIELDS }) });
  } catch (error) {
    const status = error.name === 'SequelizeUniqueConstraintError' ? 409 : 400;
    return res.status(status).json({ errors: [status === 409 ? 'Organization slug is already in use' : (error.message || 'Unable to save organization branding')], data: {} });
  }
};

router.get('/:slug', getPublicOrganizationSite);
router.get('/admin/:organizationId/branding', authUser, requireOrganizationAdmin, getOrganizationBranding);
router.patch('/admin/:organizationId/branding', authUser, requireOrganizationAdmin, updateOrganizationBranding);

export { buildPublicOrganizationSitePayload, getPublicOrganizationSite, getOrganizationBranding, updateOrganizationBranding };
export default router;
