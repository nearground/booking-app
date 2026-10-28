import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import ExperienceDetails from './ExperienceDetails';

vi.mock('./templates/PartyExperience', () => ({
  default: ({ experience }) => <div data-testid="party-template">{experience.title}</div>,
}));
vi.mock('./templates/FoodTourExperience', () => ({
  default: ({ experience, booking }) => <div data-testid="food-tour-template">{experience.title}{booking}</div>,
}));
vi.mock('../../components/scheduled-experiences-list/ScheduledExperiencesList', () => ({
  default: () => <div data-testid="session-calendar" />,
}));
vi.mock('../../components/image-gallery-modal/ImageGalleryModal', () => ({ default: () => null }));
vi.mock('../../components/comments/GuestCommentPrompt', () => ({ default: () => null }));

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({
    matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
});

const renderDetails = (detailsMetadata) => render(
  <AuthContext.Provider value={{ userDetails: null }}>
    <MemoryRouter>
      <ExperienceDetails isPreview previewData={{
        id: 1, title: 'Template preview', description: 'Description',
        detailsMetadata, comments: [], organizers: [], images: [],
      }} />
    </MemoryRouter>
  </AuthContext.Provider>
);

test.each([undefined, { version: 99, template: 'food-tour' }])(
  'missing/unsupported metadata keeps the existing gallery and calendar', (metadata) => {
    renderDetails(metadata);
    expect(screen.getByText("What You'll Do")).toBeInTheDocument();
    expect(screen.getByTestId('session-calendar')).toBeInTheDocument();
    expect(screen.queryByTestId('party-template')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-tour-template')).not.toBeInTheDocument();
  }
);

test('party dispatch does not render the shared date picker or organizer bios', () => {
  renderDetails({ version: 1, template: 'party', overrides: {} });
  expect(screen.getByTestId('party-template')).toHaveTextContent('Template preview');
  expect(screen.queryByTestId('session-calendar')).not.toBeInTheDocument();
  expect(screen.queryByText('Hosted By')).not.toBeInTheDocument();
});

test('food-tour dispatch receives the existing booking component', () => {
  renderDetails({ version: 1, template: 'food-tour', overrides: {} });
  expect(screen.getByTestId('food-tour-template')).toHaveTextContent('Template preview');
  expect(screen.getByTestId('session-calendar')).toBeInTheDocument();
});
