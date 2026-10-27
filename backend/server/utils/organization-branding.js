const RESERVED_ORGANIZATION_SLUGS = new Set([
  'www', 'api', 'admin', 'internal', 'app', 'mail', 'static', 'assets', 'docs',
  'ftp', 'smtp', 'cdn', 'support', 'help', 'blog', 'dev', 'staging', 'test',
  'localhost', 'root', 'security', 'status', 'dashboard', 'login', 'auth',
]);
const ORGANIZATION_FONTS = ['system', 'inter', 'roboto', 'lato', 'montserrat'];
const ORGANIZATION_LAYOUTS = ['classic', 'editorial', 'immersive'];
const SOCIAL_LINK_KEYS = ['website', 'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x'];
const CONTACT_LINK_KEYS = ['email', 'phone', 'whatsapp', 'website'];

const isValidOrganizationSlug = (value) => {
  const slug = String(value || '').trim();
  return slug.length >= 3 && slug.length <= 63 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !RESERVED_ORGANIZATION_SLUGS.has(slug);
};

const createOrganizationSlug = (username) => {
  const normalized = String(username || '').trim().toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
    .replace(/-$/g, '');
  const slug = normalized.length < 3 ? `org-${normalized}` : normalized;
  return RESERVED_ORGANIZATION_SLUGS.has(slug) ? `org-${slug}` : slug;
};

const isValidHttpsUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch (_error) {
    return false;
  }
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const isValidImageMediaKey = (value) => /^users\/\d+\/(?:asset|organization-logo|organization-cover)\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp|gif|avif)$/.test(String(value || ''));
const isValidCoverMediaKey = (value) => /^users\/\d+\/(?:asset|organization-logo|organization-cover)\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp|gif|avif|mp4)$/.test(String(value || ''));
const validOptionalMediaKey = (value, validator) => value === null || value === undefined || value === '' || validator(value);

const validateLinkMap = (links, allowedKeys, kind) => {
  if (!links || typeof links !== 'object' || Array.isArray(links)) return `${kind} must be an object`;
  for (const [key, value] of Object.entries(links)) {
    if (!allowedKeys.includes(key)) return `Unsupported ${kind} key: ${key}`;
    if (value === null || value === '') continue;
    if (key === 'email') {
      if (!isValidEmail(value)) return 'Contact email must be valid';
    } else if (key === 'phone') {
      if (!/^\+?[0-9 ()-]{7,24}$/.test(String(value).trim())) return 'Contact phone must be valid';
    } else if (!isValidHttpsUrl(value)) {
      return `${kind} links must use HTTPS`;
    }
  }
  return null;
};

const validateOrganizationBranding = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Branding must be an object';
  if (input.slug !== undefined && !isValidOrganizationSlug(input.slug)) return 'Slug is invalid or reserved';
  for (const field of ['primaryColor', 'accentColor']) {
    if (input[field] !== undefined && !/^#[0-9a-fA-F]{6}$/.test(String(input[field]))) return `${field} must be a hex color`;
  }
  if (input.font !== undefined && !ORGANIZATION_FONTS.includes(input.font)) return 'Font is not supported';
  if (input.layoutTemplate !== undefined && !ORGANIZATION_LAYOUTS.includes(input.layoutTemplate)) return 'Layout template is not supported';
  if (input.tagline !== undefined && String(input.tagline).length > 160) return 'Tagline must be 160 characters or fewer';
  if (input.about !== undefined && String(input.about).length > 4000) return 'About text must be 4000 characters or fewer';
  if (input.logoMediaKey !== undefined && !validOptionalMediaKey(input.logoMediaKey, isValidImageMediaKey)) return 'Logo must reference uploaded image media';
  if (input.coverMediaKey !== undefined && !validOptionalMediaKey(input.coverMediaKey, isValidCoverMediaKey)) return 'Cover must reference uploaded media';
  if (input.coverMediaType !== undefined && !['image', 'video'].includes(input.coverMediaType)) return 'Cover media type is not supported';
  if (input.coverMediaType === 'video' && input.coverMediaKey && !String(input.coverMediaKey).toLowerCase().endsWith('.mp4')) return 'Video covers must reference an MP4 upload';
  if (input.coverMediaType === 'image' && String(input.coverMediaKey || '').toLowerCase().endsWith('.mp4')) return 'Image covers cannot reference video uploads';
  const socialError = input.socialLinks === undefined ? null : validateLinkMap(input.socialLinks, SOCIAL_LINK_KEYS, 'Social');
  if (socialError) return socialError;
  const contactError = input.contactLinks === undefined ? null : validateLinkMap(input.contactLinks, CONTACT_LINK_KEYS, 'Contact');
  return contactError;
};

export {
  CONTACT_LINK_KEYS,
  ORGANIZATION_FONTS,
  ORGANIZATION_LAYOUTS,
  RESERVED_ORGANIZATION_SLUGS,
  SOCIAL_LINK_KEYS,
  createOrganizationSlug,
  isValidHttpsUrl,
  isValidOrganizationSlug,
  validateOrganizationBranding,
};
