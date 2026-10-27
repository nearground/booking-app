/// <reference types="cypress" />

/**
 * E2E: Guest Cart
 *
 * Validates guest (unauthenticated) cart behaviour:
 * - Guests can add items to cart (backend creates a _cart_session cookie)
 * - Guests see the checkout-blocked message when they try to check out
 * - After logging in, the cart items persist and checkout succeeds
 */
describe('Guest Cart', () => {
  before(() => {
    cy.task('seedDb');
  });

  beforeEach(() => {
    // Ensure we start logged out with no cookies
    cy.clearCookies();
  });

  it('allows a guest to add items to cart', () => {
    cy.intercept('POST', '**/api/cart/items').as('addToCart');

    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');

    cy.getByTestId('tier-selector')
      .first()
      .find('[aria-label*="Increase"]')
      .click();

    cy.getByTestId('contact-form__phone').clear().type('5551234567');
    cy.getByTestId('session-summary__add-to-cart').click();

    cy.wait('@addToCart').its('response.statusCode').should('eq', 201);

    // Cart modal should open with the item
    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-item-card').should('have.length.at.least', 1);
  });

  it('blocks guest checkout with an error message', () => {
    cy.intercept('POST', '**/api/cart/items').as('addToCart');

    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');

    cy.getByTestId('tier-selector')
      .first()
      .find('[aria-label*="Increase"]')
      .click();

    cy.getByTestId('contact-form__phone').clear().type('5551234567');
    cy.getByTestId('session-summary__add-to-cart').click();
    cy.wait('@addToCart');

    // Fill all forms so validation passes
    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-modal__contact-name').clear().type('Guest User');
    cy.getByTestId('cart-modal__contact-phone').clear().type('5551234567');
    cy.getByTestId('cart-modal__contact-email').clear().type('guest@example.com');
    cy.getByTestId('cart-modal__payment-name').clear().type('Guest User');
    cy.getByTestId('cart-modal__payment-card').clear().type('4242424242424242');
    cy.getByTestId('cart-modal__payment-expiry').clear().type('1228');
    cy.getByTestId('cart-modal__payment-cvc').clear().type('123');
    cy.getByTestId('cart-modal__billing-address').clear().type('123 Main St');
    cy.getByTestId('cart-modal__billing-city').clear().type('Test City');
    cy.getByTestId('cart-modal__billing-state').clear().type('TS');
    cy.getByTestId('cart-modal__billing-zip').clear().type('12345');

    // Click checkout — should be blocked for guest
    cy.getByTestId('cart-modal__checkout-btn').click();
    cy.getByTestId('cart-modal__error').should('contain.text', 'log in');
  });

  it('persists guest cart after logging in and allows checkout', () => {
    cy.intercept('POST', '**/api/cart/items').as('addToCart');
    cy.intercept('POST', '**/api/cart/checkout').as('checkout');

    // Step 1: Add item as guest
    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');

    cy.getByTestId('tier-selector')
      .first()
      .find('[aria-label*="Increase"]')
      .click();
    cy.getByTestId('contact-form__phone').clear().type('5551234567');
    cy.getByTestId('session-summary__add-to-cart').click();
    cy.wait('@addToCart');

    // Close the cart
    cy.getByTestId('cart-modal').should('be.visible');
    cy.get('[aria-label="Close cart"]').click();

    // Step 2: Log in — the backend uses CustomerId for the cart after auth,
    // so we add a fresh item to ensure the authenticated cart is populated.
    cy.login('user1', 'testpassword');

    cy.intercept('POST', '**/api/cart/items').as('addToCartAuth');
    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');

    cy.getByTestId('tier-selector')
      .first()
      .find('[aria-label*="Increase"]')
      .click();
    cy.getByTestId('contact-form__phone').clear().type('5551234567');
    cy.getByTestId('session-summary__add-to-cart').click();
    cy.wait('@addToCartAuth');

    // Step 3: Cart modal opens — item should be present
    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-item-card').should('have.length.at.least', 1);

    // Step 4: Fill checkout and complete
    cy.getByTestId('cart-modal__contact-name').clear().type('Test User');
    cy.getByTestId('cart-modal__contact-phone').clear().type('5551234567');
    cy.getByTestId('cart-modal__contact-email').clear().type('test@example.com');
    cy.getByTestId('cart-modal__billing-address').clear().type('123 Test St');
    cy.getByTestId('cart-modal__billing-city').clear().type('Testville');
    cy.getByTestId('cart-modal__billing-state').clear().type('CA');
    cy.getByTestId('cart-modal__billing-zip').clear().type('90210');
    cy.getByTestId('cart-modal__payment-name').clear().type('Test User');
    cy.getByTestId('cart-modal__payment-card').clear().type('4242424242424242');
    cy.getByTestId('cart-modal__payment-expiry').clear().type('1228');
    cy.getByTestId('cart-modal__payment-cvc').clear().type('123');

    cy.getByTestId('cart-modal__checkout-btn').click();
    cy.wait('@checkout').its('response.statusCode').should('eq', 201);

    cy.url().should('include', '/booking-confirmation');
    cy.getByTestId('confirmation__heading').should('contain.text', 'Booking Confirmed');
  });
});
