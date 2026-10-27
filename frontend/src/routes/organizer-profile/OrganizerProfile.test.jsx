import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import OrganizerProfile from './OrganizerProfile';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: {
    get: vi.fn((url) => {
      if (url === '/api/organizers/workspace') {
        return Promise.resolve({
          data: {
            organizer: { id: 1, description: 'Lead guide' },
            organizations: [
              {
                id: 1,
                name: 'Acme Adventures',
                email: 'team@acme.test',
                members: [],
                pendingInvites: [],
                Experiences: [],
              },
            ],
          },
        });
      }

      if (url === '/api/organizers/onboarding/meta') {
        return Promise.resolve({ data: { locations: [] } });
      }

      if (url === '/api/organizers/comments/received') {
        return Promise.resolve({
          data: { elements: [] },
          metadata: { currentPage: 1, totalPages: 0, totalItems: 0, hasNext: false },
        });
      }

      return Promise.resolve({ data: {} });
    }),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

vi.mock('components/ux/toast/Toast', () => ({ default: () => null }));
vi.mock('./components/KpiGrid', () => ({ default: () => <div>Dashboard panel</div> }));
vi.mock('./components/UpcomingSessionsPanel', () => ({ default: () => <div>Sessions panel</div> }));
vi.mock('components/comments/CommentsSection', () => ({ default: () => <div>Comments panel</div> }));
vi.mock('./components/OrganizerDetailsCard', () => ({ default: () => <div>Profile panel</div> }));
vi.mock('./components/LocationsPanel', () => ({ default: () => <div>Locations panel</div> }));
vi.mock('./components/OrgMembersPanel', () => ({ default: () => <div>Organization members panel</div> }));
vi.mock('./components/OrgExperiencesPanel', () => ({ default: () => <div>Organization experiences panel</div> }));

describe('OrganizerProfile', () => {
  test('shows separate Organization and Experiences tabs and switches between their panels', async () => {
    render(
      <AuthContext.Provider
        value={{
          userDetails: { profilePicture: '', organizations: [{ id: 1, isAdmin: true }] },
          triggerAuthCheck: vi.fn().mockResolvedValue(true),
        }}
      >
        <MemoryRouter>
          <OrganizerProfile />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByRole('button', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Experiences' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Organization' }));
    expect(screen.getByText('Organization members panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Experiences' }));
    expect(screen.getByText('Organization experiences panel')).toBeInTheDocument();
  });
});