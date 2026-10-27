import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import OrganizationBrandingEditor from './OrganizationBrandingEditor';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { get: vi.fn(), patch: vi.fn(), upload: vi.fn() },
}));

describe('organization branding editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    networkAdapter.get.mockResolvedValue({ ok: true, data: { id: 8, name: 'Organization', slug: 'org-site', socialLinks: {}, contactLinks: {} } });
    networkAdapter.patch.mockResolvedValue({ ok: true, data: { id: 8, name: 'Organization', slug: 'new-site', socialLinks: {}, contactLinks: {} } });
  });

  test('loads defaults and saves only branding fields, not private response metadata', async () => {
    render(
      <AuthContext.Provider value={{ userDetails: { id: 3 } }}>
        <MemoryRouter initialEntries={['/organizer-profile/branding/8']}>
          <Routes><Route path="/organizer-profile/branding/:organizationId" element={<OrganizationBrandingEditor />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(await screen.findByDisplayValue('org-site')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tagline'), { target: { value: 'Discover the coast' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save branding' }));
    await waitFor(() => expect(networkAdapter.patch).toHaveBeenCalled());
    const [endpoint, payload] = networkAdapter.patch.mock.calls[0];
    expect(endpoint).toBe('/api/organization-sites/admin/8/branding');
    expect(payload).toMatchObject({ slug: 'org-site', tagline: 'Discover the coast', primaryColor: '#0f766e' });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('name');
  });
});
