import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import OrganizerCard from './OrganizerCard';
import OrganizerDetailsModal from './OrganizerDetailsModal';

describe('OrganizerCard', () => {
  const organizer = {
    id: 8,
    name: 'Sofia Martinez',
    description: 'A local chef sharing the markets and street food she loves.',
    organizerComments: [{ id: 5, stars: 5, title: 'A wonderful guide', comment: 'So welcoming.' }],
  };

  test('keeps the standard organizer selection behavior', () => {
    const onSelect = vi.fn();
    render(<OrganizerCard organizer={organizer} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Sofia Martinez/ }));
    expect(onSelect).toHaveBeenCalledWith(organizer);
    expect(screen.queryByText(organizer.description)).not.toBeInTheDocument();
  });

  test('compact bio opens the existing modal with biography and organizer comments', () => {
    const Host = () => {
      const [selected, setSelected] = React.useState(null);
      return (
        <>
          <OrganizerCard organizer={organizer} compact onSelect={setSelected} />
          <OrganizerDetailsModal organizer={selected} onClose={() => setSelected(null)} />
        </>
      );
    };
    render(<Host />);
    expect(screen.getByText(organizer.description)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /bio and organizer comments/ }));
    expect(screen.getByText('Organizer Comments')).toBeInTheDocument();
    expect(screen.getByText('A wonderful guide')).toBeInTheDocument();
    expect(screen.getAllByText(organizer.description)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Close organizer details' }));
    expect(screen.queryByText('Organizer Comments')).not.toBeInTheDocument();
  });

  test('uses the same fallback name and initials in compact mode', () => {
    render(<OrganizerCard organizer={{ firstName: 'Ana', lastName: 'Diaz' }} compact onSelect={() => {}} />);
    expect(screen.getByText('Ana Diaz')).toBeInTheDocument();
    expect(screen.getByText('AD')).toBeInTheDocument();
  });
});
