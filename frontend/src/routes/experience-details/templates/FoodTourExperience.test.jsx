import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import FoodTourExperience, { selectFoodTourPinnedComments } from './FoodTourExperience';
import documentHtml from '../../../../index.html?raw';

const review = (id, extra = {}) => ({
  id,
  stars: 5,
  title: `Guest review ${id}`,
  comment: `Our delicious stop ${id}`,
  anonymity: 2,
  commenter: { firstName: 'Ana', lastName: 'Diaz' },
  ...extra,
});
const experience = { title: 'Market to table', subtitle: 'A local food adventure' };

describe('FoodTourExperience', () => {
  test('loads the seeded Lato brand font alongside the existing Jost font', () => {
    const document = new DOMParser().parseFromString(documentHtml, 'text/html');
    const stylesheet = document.querySelector('link[href^="https://fonts.googleapis.com/css2"]');
    expect(new URL(stylesheet.href).searchParams.getAll('family')).toEqual([
      'Jost:wght@400;500;700', 'Lato:wght@400;700',
    ]);
    render(<FoodTourExperience experience={{ ...experience, Organization: { font: 'lato' } }} />);
    expect(screen.getByTestId('food-tour-experience')).toHaveClass('food-tour-experience--lato');
  });

  test('shows exactly three ordered five-star pinned experience comments at the bottom', () => {
    const pinnedComments = [review(3), review(1), review(2)];
    const { container } = render(
      <FoodTourExperience experience={experience} presentation={{ pinnedComments }}>
        <div>Booking, location and regular comments</div>
      </FoodTourExperience>
    );
    const pins = screen.getByRole('region', { name: 'Pinned experience comments' });
    expect(container.firstChild.lastChild).toBe(pins);
    expect(within(pins).getAllByTestId('food-tour-pinned-comment')).toHaveLength(3);
    expect(within(pins).getAllByRole('heading', { level: 3 }).map((node) => node.textContent))
      .toEqual(['Guest review 3', 'Guest review 1', 'Guest review 2']);
    expect(within(pins).getAllByLabelText('5 out of 5 stars')).toHaveLength(3);
    expect(screen.getByText('Booking, location and regular comments')).toBeInTheDocument();
  });

  test('does not invent reviews or fill missing pins from unpinned comments', () => {
    render(<FoodTourExperience experience={{ ...experience, comments: [review(1)] }} />);
    expect(screen.queryByRole('region', { name: 'Pinned experience comments' })).not.toBeInTheDocument();
  });

  test('integrates resolved backend media keys, booking, compact organizers and ordered pin IDs', () => {
    const organizer = { id: 8, name: 'Sofia', description: 'A market chef.' };
    const onSelectOrganizer = vi.fn();
    const data = {
      ...experience,
      description: 'Visit the market.\n\nTaste local tacos.',
      Organization: { font: 'montserrat' },
      organizers: [organizer],
      comments: [review(1), review(2), review(3)],
      Location: { name: 'Market entrance', city: 'Puerto Vallarta' },
    };
    const metadata = {
      version: 1,
      template: 'food-tour',
      overrides: {
        heroVideoKey: 'users/1/experience-hero/tacos.mp4',
        heroPosterKey: 'users/1/experience-hero/tacos.jpg',
        pinnedCommentIds: [3, 1, 2],
      },
    };
    const { container } = render(<FoodTourExperience
      experience={data}
      metadata={metadata}
      booking={<button>Choose a tour time</button>}
      reviews={<p>Shared review composer</p>}
      onSelectOrganizer={onSelectOrganizer}
    />);
    expect(container.querySelector('.food-tour-hero img')).toHaveAttribute(
      'src', '/api/media/object/users/1/experience-hero/tacos.jpg'
    );
    expect(screen.getByTestId('food-tour-experience')).toHaveClass('food-tour-experience--montserrat');
    expect(screen.getByText('Visit the market.')).toBeInTheDocument();
    expect(screen.getByText('Taste local tacos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a tour time' })).toBeInTheDocument();
    expect(screen.getByText('Shared review composer')).toBeInTheDocument();
    expect(screen.getByText('Market entrance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sofia's bio/ }));
    expect(onSelectOrganizer).toHaveBeenCalledWith(organizer);
    expect(screen.getAllByTestId('food-tour-pinned-comment').map((card) =>
      within(card).getByRole('heading', { level: 3 }).textContent
    )).toEqual(['Guest review 3', 'Guest review 1', 'Guest review 2']);
  });

  test('rejects replies, non-five-star reviews, organizer reviews, duplicates and extra pins', () => {
    const comments = [
      review(1, { ParentId: 12 }),
      review(2, { stars: 4 }),
      review(3, { target: { type: 'organizer' } }),
      review(4),
      review('4'),
      review(5),
      review(6),
      review(7),
    ];
    expect(selectFoodTourPinnedComments(comments).map((comment) => comment.id)).toEqual([4, 5, 6]);
    expect(selectFoodTourPinnedComments(null)).toEqual([]);
  });

  test('prefers public backend media resolution over preview key URLs', () => {
    const { container } = render(<FoodTourExperience experience={{
      ...experience,
      detailsMedia: { heroPosterUrl: 'https://media.example.test/uploaded-tacos.jpg' },
      detailsMetadata: {
        version: 1,
        template: 'food-tour',
        overrides: { heroPosterKey: 'users/1/experience-hero/preview.jpg' },
      },
    }} />);
    expect(container.querySelector('.food-tour-hero img')).toHaveAttribute(
      'src', 'https://media.example.test/uploaded-tacos.jpg'
    );
  });

  test('respects full and partial anonymity in pinned testimonials', () => {
    render(<FoodTourExperience experience={experience} presentation={{
      pinnedComments: [
        review(1, { anonymity: 0 }),
        review(2, { anonymity: 1 }),
      ],
    }} />);
    const pins = screen.getByRole('region', { name: 'Pinned experience comments' });
    expect(within(pins).getByText('Anonymous')).toBeInTheDocument();
    expect(within(pins).getByText('Ana')).toBeInTheDocument();
    expect(within(pins).queryByText(/Diaz/)).not.toBeInTheDocument();
  });

  test('applies only predefined brand fonts and UX tokens, never arbitrary style or HTML', () => {
    const { rerender } = render(<FoodTourExperience experience={experience} presentation={{
      brandFont: 'rounded',
      uxOverrides: { accent: 'forest', density: 'compact', corners: 'square' },
    }} />);
    const root = screen.getByTestId('food-tour-experience');
    expect(root).toHaveClass('food-tour-experience--rounded', 'food-tour-experience--forest',
      'food-tour-experience--compact', 'food-tour-experience--square');
    rerender(<FoodTourExperience experience={experience} presentation={{
      brandFont: 'url(https://untrusted.test/font)',
      uxOverrides: { accent: '<style>bad</style>', css: 'display:none', html: '<script>bad</script>' },
    }} />);
    expect(root).toHaveClass('food-tour-experience--editorial', 'food-tour-experience--terracotta');
    expect(root).not.toHaveAttribute('style');
    expect(root.querySelector('script, style')).toBeNull();
  });

  test('uses the organization primary color only when it is a valid hex value', () => {
    const { rerender } = render(<FoodTourExperience experience={{
      ...experience, Organization: { primaryColor: '#9B2E20' },
    }} />);
    const root = screen.getByTestId('food-tour-experience');
    expect(root.style.getPropertyValue('--food-tour-accent')).toBe('#9B2E20');
    rerender(<FoodTourExperience experience={{
      ...experience, Organization: { primaryColor: 'red; display: none' },
    }} />);
    expect(root.style.getPropertyValue('--food-tour-accent')).toBe('');
    expect(root.style.display).toBe('');
  });
});
