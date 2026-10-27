// ***********************************************
// Custom Cypress commands for E2E testing
// ***********************************************

const API_BASE = Cypress.env('API_BASE_URL') || 'http://localhost:4000';

/**
 * Login via API — bypasses UI for non-auth tests.
 * Sets httpOnly cookies directly through the backend.
 */
Cypress.Commands.add('login', (username, password) => {
  cy.request({
    method: 'POST',
    url: `${API_BASE}/api/users/login`,
    body: { username, password },
  }).then((response) => {
    expect(response.status).to.eq(200);
  });
});

/**
 * Register a new user via API.
 */
Cypress.Commands.add('register', (userData) => {
  cy.request({
    method: 'PUT',
    url: `${API_BASE}/api/users/register`,
    body: userData,
    failOnStatusCode: false,
  });
});

/**
 * Logout via API — clears auth cookies.
 */
Cypress.Commands.add('logout', () => {
  cy.getCookie('_csrf_token').then((cookie) => {
    cy.request({
      method: 'POST',
      url: `${API_BASE}/api/users/logout`,
      headers: {
        'x-csrf-token': cookie ? cookie.value : '',
      },
      failOnStatusCode: false,
    });
  });
});

/**
 * Clear the active cart via API.
 * Reads the CSRF token cookie set after login and sends it in the request header.
 */
Cypress.Commands.add('clearCartApi', () => {
  cy.getCookie('_csrf_token').then((cookie) => {
    cy.request({
      method: 'DELETE',
      url: `${API_BASE}/api/cart/`,
      headers: {
        'x-csrf-token': cookie ? cookie.value : '',
      },
      failOnStatusCode: false,
    });
  });
});

/**
 * Shorthand for selecting elements by data-testid.
 */
Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});

/**
 * Answer every questionnaire prompt in the booking modal so required
 * questions (e.g. age confirmations) don't block add-to-cart.
 */
Cypress.Commands.add('answerBookingQuestionnaire', () => {
  cy.getByTestId('booking-modal').then(($modal) => {
    const sections = $modal.find('[data-testid="questionnaire-section"]');
    if (sections.length === 0) return;
    cy.wrap(sections).find('input[type="checkbox"]').check({ force: true });
    cy.wrap(sections).find('input[type="text"]').each(($input) => {
      if (!$input.val()) cy.wrap($input).type('Yes');
    });
  });
});

/**
 * Assert a toast notification appears containing the given text.
 */
Cypress.Commands.add('assertToast', (text) => {
  cy.getByTestId('toast__message').should('contain.text', text);
});

/**
 * Add an item to cart via the booking UI flow.
 * Navigates to the experience, selects the first session, picks tickets, and submits.
 *
 * @param {string} experienceCode - The experience ID/code to visit
 * @param {object} [options] - Options for ticket selection
 * @param {number} [options.tierIndex=0] - Which ticket tier to select (0-based)
 * @param {number} [options.quantity=1] - How many tickets
 * @param {string} [options.phone='5551234567'] - Phone for main contact
 */
Cypress.Commands.add('addItemToCartViaUI', (experienceCode, options = {}) => {
  const { tierIndex = 0, quantity = 1, phone = '5551234567' } = options;

  cy.visit(`/experience/${experienceCode}`);
  cy.getByTestId('experience-details__title').should('be.visible');

  // Wait for sessions to load and click the first one
  cy.getByTestId('session-card').first().click();

  // Select tickets
  for (let i = 0; i < quantity; i++) {
    cy.getByTestId('tier-selector')
      .eq(tierIndex)
      .find('[aria-label*="Increase"]')
      .click();
  }

  // Fill phone
  cy.getByTestId('contact-form__phone').clear().type(phone);

  // Submit
  cy.getByTestId('session-summary__add-to-cart').click();
});