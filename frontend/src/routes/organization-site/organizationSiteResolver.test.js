import { isValidOrganizationSiteSlug, resolveOrganizationSlugFromHost } from './organizationSiteResolver';

describe('organization hostname and slug resolution', () => {
  test.each([
    ['pv-adventures.puertovallarta.today', 'pv-adventures'],
    ['pv-adventures.puertovallarta.today:3000', 'pv-adventures'],
  ])('resolves %s', (host, expected) => {
    expect(resolveOrganizationSlugFromHost(host)).toBe(expected);
  });

  test.each([
    'puertovallarta.today', 'www.puertovallarta.today', 'api.puertovallarta.today',
    'admin.puertovallarta.today', 'a.b.puertovallarta.today', 'attacker.example.com',
  ])('does not resolve %s', (host) => {
    expect(resolveOrganizationSlugFromHost(host)).toBeNull();
  });

  test('local route slugs enforce DNS-safe syntax and reserved names', () => {
    expect(isValidOrganizationSiteSlug('my-org')).toBe(true);
    expect(isValidOrganizationSiteSlug('internal')).toBe(false);
    expect(isValidOrganizationSiteSlug('bad_slug')).toBe(false);
  });
});
