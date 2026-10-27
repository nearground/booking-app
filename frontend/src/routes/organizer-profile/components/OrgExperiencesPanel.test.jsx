import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrgExperiencesPanel from './OrgExperiencesPanel';

const baseOrganization = {
  id: 1,
  name: 'Acme Adventures',
  members: [
    { id: 10, firstName: 'Sam', lastName: 'Guide' },
  ],
  Experiences: [
    {
      id: 21,
      code: 'sunset-cruise',
      title: 'Sunset Cruise',
      subtitle: 'Evening sail',
      description: 'Best views in town.',
      thumbnail: 'http://example.com/sunset.jpg',
      capacity: 12,
      duration: 90,
      autoSyncEnabled: true,
      scheduleLookaheadDays: 45,
      Organizers: [{ id: 10 }],
      ScheduledExperiences: [
        { id: 301, dateTime: '2099-05-01T12:00:00.000Z', availableSpots: 6, syncLocked: false },
      ],
      ScheduleTemplates: [],
    },
  ],
};

const renderPanel = (overrides = {}) => {
  const props = {
    organizations: [baseOrganization],
    organization: baseOrganization,
    selectedOrganizationId: '1',
    onSelectOrganization: vi.fn(),
    isAdmin: true,
    experienceEdits: {},
    setExperienceEdits: vi.fn(),
    saveExperienceAssignments: vi.fn(),
    saveExperience: vi.fn(),
    syncExperienceSchedule: vi.fn(),
    toggleAutoSync: vi.fn(),
    toggleSessionSyncLock: vi.fn(),
    updateLookahead: vi.fn(),
    deleteExperience: vi.fn().mockResolvedValue(true),
    ...overrides,
  };

  return {
    ...render(
      <MemoryRouter>
        <OrgExperiencesPanel {...props} />
      </MemoryRouter>
    ),
    props,
  };
};

describe('OrgExperiencesPanel', () => {
  test('renders experience cards and filters them by search term', () => {
    renderPanel();

    expect(screen.getByText('Sunset Cruise')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search experiences'), {
      target: { value: 'dolphin' },
    });

    expect(screen.getByText('No experiences match your filters')).toBeInTheDocument();
  });

  test('shows delete confirmation and calls deleteExperience when confirmed', async () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    await waitFor(() => {
      expect(props.deleteExperience).toHaveBeenCalledWith(21);
    });
  });

  test('renders an empty-state CTA when the organization has no experiences', () => {
    renderPanel({
      organization: { ...baseOrganization, Experiences: [] },
      organizations: [{ ...baseOrganization, Experiences: [] }],
    });

    expect(screen.getByText('No experiences yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first experience' })).toBeInTheDocument();
  });
});