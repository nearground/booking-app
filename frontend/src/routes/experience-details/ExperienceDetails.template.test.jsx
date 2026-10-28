import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import ExperienceDetails from './ExperienceDetails';

vi.mock('./templates/EventExperience', () => ({
  default: ({ experience }) => <div data-testid="event-template">{experience.title}</div>,
}));
vi.mock('./templates/FoodTourExperience', () => ({
  default: ({ experience, booking, reviews }) => <div data-testid="food-tour-template">{experience.title}{booking}<div data-testid="reviews-slot">{reviews}</div></div>,
}));
vi.mock('../../components/scheduled-experiences-list/ScheduledExperiencesList', () => ({
  default: () => <div data-testid="session-calendar" />,
}));
vi.mock('../../components/image-gallery-modal/ImageGalleryModal', () => ({ default: () => null }));
vi.mock('../../components/comments/GuestCommentPrompt', () => ({ default: () => <div data-testid="guest-review-prompt" /> }));
vi.mock('../../components/comments/CommentCard', () => ({
  default: ({ comment }) => <div data-testid={`comment-${comment.id}`}>{comment.comment}</div>,
}));

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({
    matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
});

const renderDetails = (detailsMetadata, comments = []) => render(
  <AuthContext.Provider value={{ userDetails: null }}>
    <MemoryRouter>
      <ExperienceDetails isPreview previewData={{
        id: 1, title: 'Template preview', description: 'Description',
        detailsMetadata, comments, organizers: [], images: [],
      }} />
    </MemoryRouter>
  </AuthContext.Provider>
);

test.each([undefined, { version: 99, template: 'food-tour' }])(
  'missing/unsupported metadata keeps the existing gallery and calendar', (metadata) => {
    renderDetails(metadata);
    expect(screen.getByText("What You'll Do")).toBeInTheDocument();
    expect(screen.getByTestId('session-calendar')).toBeInTheDocument();
    expect(screen.queryByTestId('event-template')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-tour-template')).not.toBeInTheDocument();
  }
);

test('event dispatch does not render the shared date picker or organizer bios', () => {
  renderDetails({ version: 1, template: 'event', overrides: {} });
  expect(screen.getByTestId('event-template')).toHaveTextContent('Template preview');
  expect(screen.queryByTestId('session-calendar')).not.toBeInTheDocument();
  expect(screen.queryByText('Hosted By')).not.toBeInTheDocument();
});

test('pinned five-star reviews render on the event template', () => {
  renderDetails({ version: 1, template: 'event', overrides: { pinnedCommentIds: [1] } }, [
    { id: 1, stars: 5, title: 'A featured review', comment: 'A great event from beginning to end.' },
  ]);
  expect(screen.getByRole('region', { name: 'Pinned experience comments' })).toBeInTheDocument();
  expect(screen.getByText('A featured review')).toBeInTheDocument();
});

test('default template renders pinned comments directly below its description', () => {
  renderDetails({ version: 1, template: 'default', overrides: { pinnedCommentIds: [1] } }, [
    { id: 1, stars: 5, title: 'A featured review', comment: 'A great experience.' },
  ]);
  const descriptionHeading = screen.getByRole('heading', { name: "What You'll Do" });
  const pinnedComments = screen.getByRole('region', { name: 'Pinned experience comments' });

  expect(pinnedComments.parentElement).toBe(descriptionHeading.parentElement);
  expect(pinnedComments).toBeInTheDocument();
});

test('food-tour dispatch receives the existing booking component', () => {
  renderDetails({ version: 1, template: 'food-tour', overrides: {} });
  expect(screen.getByTestId('food-tour-template')).toHaveTextContent('Template preview');
  expect(screen.getByTestId('session-calendar')).toBeInTheDocument();
  expect(screen.getByTestId('reviews-slot')).toBeInTheDocument();
  expect(screen.getByTestId('guest-review-prompt')).toBeInTheDocument();
  expect(screen.getByTestId('food-tour-template').parentElement).not.toHaveClass('container');
});

test('food-tour ordinary review preview excludes pinned reviews without removing its review workflow', async () => {
  renderDetails({ version: 1, template: 'food-tour', overrides: { pinnedCommentIds: [1] } }, [
    { id: 1, stars: 5, comment: 'Pinned review' },
    { id: 2, stars: 4, comment: 'Ordinary review' },
  ]);
  expect(await screen.findByTestId('comment-2')).toHaveTextContent('Ordinary review');
  expect(screen.queryByTestId('comment-1')).not.toBeInTheDocument();
  expect(screen.getByTestId('guest-review-prompt')).toBeInTheDocument();
});
