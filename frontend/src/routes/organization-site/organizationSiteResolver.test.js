import { isValidOrganizationSiteSlug, resolveOrganizationSlugFromHost, resolveAppUrl } from './organizationSiteResolver';

describe('app link origins', () => {
  test.each([
    ['http://localhost:8080', 'http://localhost:8080'],
    ['http://localhost:3300', 'http://localhost:3300'],
    ['http://192.168.1.25:8080', 'http://192.168.1.25:8080'],
    ['http://[::1]:8080', 'http://[::1]:8080'],
    ['https://preview.example.com', 'https://preview.example.com'],
    ['https://puertovallarta.today', 'https://puertovallarta.today'],
    ['https://pv-adventures.puertovallarta.today', 'https://puertovallarta.today'],
  ])('links from %s to %s', (origin, expected) => {
    expect(resolveAppUrl('/experience/7', origin)).toBe(`${expected}/experience/7`);
    expect(resolveAppUrl('/experiences', origin)).toBe(`${expected}/experiences`);
  });
});

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
