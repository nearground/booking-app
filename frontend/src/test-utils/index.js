import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';

const defaultAuthValue = {
  isAuthenticated: false,
  userDetails: null,
  isAuthResolved: true,
  triggerAuthCheck: () => Promise.resolve(false),
};

export function renderWithProviders(
  ui,
  { authValue = defaultAuthValue, initialEntries = ['/'] } = {}
) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
}
