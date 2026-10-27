const RESERVED_SLUGS = new Set(['www', 'api', 'admin', 'internal', 'app', 'mail', 'static', 'assets', 'docs', 'ftp', 'smtp', 'cdn', 'support', 'help', 'blog', 'dev', 'staging', 'test', 'localhost', 'root', 'security', 'status', 'dashboard', 'login', 'auth']);
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const isValidOrganizationSiteSlug = (slug) => {
  const normalized = String(slug || '').toLowerCase();
  return normalized.length >= 3 && normalized.length <= 63 && SLUG_PATTERN.test(normalized) && !RESERVED_SLUGS.has(normalized);
};

export const resolveOrganizationSlugFromHost = (hostname, domain = 'puertovallarta.today') => {
  const host = String(hostname || '').toLowerCase().split(':')[0].replace(/\.$/, '');
  const suffix = `.${domain.toLowerCase()}`;
  if (!host.endsWith(suffix)) return null;
  const slug = host.slice(0, -suffix.length);
  if (slug.includes('.') || !isValidOrganizationSiteSlug(slug)) return null;
  return slug;
};
