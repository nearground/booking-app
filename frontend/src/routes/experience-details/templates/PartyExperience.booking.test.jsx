import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthContext } from 'contexts/AuthContext';
import { CartContext } from 'contexts/CartContext';
import { networkAdapter } from 'services/NetworkAdapter';
import PartyExperience from './PartyExperience';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { get: vi.fn() },
}));

describe('PartyExperience existing booking integration', () => {
  test.each([false, true])(
    'adds a free fixed-session ticket with explicit consent=%s',
    async (shareProfile) => {
      const addToCart = vi.fn().mockResolvedValue({});
      const openCart = vi.fn();
      networkAdapter.get.mockResolvedValue({
        data: {
          session: {
            id: 91,
            dateTime: '2099-12-20T21:00:00Z',
            status: 'scheduled',
            availableSpots: 4,
          },
          checkedInCount: 0,
          attendees: [],
        },
      });
      render(
        <AuthContext.Provider
          value={{
            isAuthenticated: true,
            userDetails: { firstName: 'Alex', phoneNumber: '5551234567' },
          }}
        >
          <CartContext.Provider value={{ addToCart, openCart }}>
            <PartyExperience
              experience={{
                id: 7,
                title: 'After Dark',
                duration: 180,
                TicketTiers: [{ id: 3, title: 'Free entry', price: '0.00' }],
              }}
            />
          </CartContext.Provider>
        </AuthContext.Provider>
      );
      fireEvent.click(
        await screen.findByRole('button', { name: 'Register for free' })
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Increase Free entry quantity' })
      );
      const consent = screen.getByRole('checkbox', {
        name: /Show my registered profile name and avatar publicly/,
      });
      expect(consent).not.toBeChecked();
      if (shareProfile) fireEvent.click(consent);
      fireEvent.click(screen.getByRole('button', { name: 'Add To Cart' }));
      await waitFor(() => expect(addToCart).toHaveBeenCalledTimes(1));
      const item = addToCart.mock.calls[0][0];
      expect(item).toEqual(
        expect.objectContaining({
          ProductId: 7,
          ProductType: 'Experience',
          unitPrice: 0,
          quantity: 1,
          metadata: expect.objectContaining({
            ScheduledExperienceId: 91,
            ticketSelections: [
              expect.objectContaining({
                ticketTierId: 3,
                quantity: 1,
                unitPrice: 0,
              }),
            ],
          }),
        })
      );
      expect(item.metadata.reservationAnswers).toEqual(
        shareProfile
          ? [
              expect.objectContaining({
                questionKey: 'publicAttendance',
                answerText: 'true',
              }),
            ]
          : []
      );
      await waitFor(() => expect(openCart).toHaveBeenCalledTimes(1));
    }
  );
});
