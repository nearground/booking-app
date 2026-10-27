import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import EditExperience from './EditExperience';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    upload: vi.fn(),
  },
}));

// CreateExperience is a complex component with leaflet and maps — mock it
vi.mock('routes/create-experience/CreateExperience', () => ({
  default: ({ mode, experienceData }) => (
    <div data-testid="create-experience-stub">
      <span data-testid="mode">{mode}</span>
      <span data-testid="experience-id">{experienceData?.id}</span>
    </div>
  ),
}));

const userDetails = {
  id: 42,
  firstName: 'Alice',
  lastName: 'Admin',
  organizerProfile: { id: 1 },
  organizations: [{ id: 10, name: 'Test Org', isAdmin: true }],
};

const renderEditExperience = (experienceId = '99') => {
  return render(
    <AuthContext.Provider value={{ userDetails }}>
      <MemoryRouter initialEntries={[`/edit-experience/${experienceId}`]}>
        <Routes>
          <Route path="/edit-experience/:experienceId" element={<EditExperience />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('EditExperience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows loading state initially', () => {
    networkAdapter.get.mockReturnValue(new Promise(() => {})); // never resolves

    renderEditExperience('99');

    expect(screen.getByText('Loading experience…')).toBeInTheDocument();
  });

  test('shows error state when API returns errors', async () => {
    networkAdapter.get.mockResolvedValue({
      errors: ['Only organization admins can access this resource'],
      data: {},
    });

    renderEditExperience('99');

    await waitFor(() => {
      expect(screen.getByText('Only organization admins can access this resource')).toBeInTheDocument();
    });
  });

  test('shows error state when API returns no experience', async () => {
    networkAdapter.get.mockResolvedValue({
      errors: [],
      data: {},
    });

    renderEditExperience('99');

    await waitFor(() => {
      expect(screen.getByText('Experience not found.')).toBeInTheDocument();
    });
  });

  test('renders CreateExperience in edit mode after loading', async () => {
    const experienceData = {
      id: 99,
      title: 'Sunset Cruise',
      OrganizationId: 10,
      LocationId: 5,
      capacity: 12,
      duration: 90,
      userQuestionnary: [],
      TicketTiers: [],
      ScheduleTemplates: [],
      PickedOccurrences: [],
      Organizers: [],
    };

    networkAdapter.get.mockResolvedValue({
      errors: [],
      data: { experience: experienceData },
    });

    renderEditExperience('99');

    await waitFor(() => {
      expect(screen.getByTestId('create-experience-stub')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('edit');
    expect(screen.getByTestId('experience-id')).toHaveTextContent('99');
  });

  test('shows error for non-integer experience ID', async () => {
    renderEditExperience('not-a-number');

    await waitFor(() => {
      expect(screen.getByText('Invalid experience ID.')).toBeInTheDocument();
    });
  });
});
