/// <reference types="cypress" />

/**
 * E2E: Cart & Checkout — Core Template Spec
 *
 * This is the highest-value booking spec: an authenticated user adds an item,
 * reviews the cart, fills contact / billing / payment forms, submits checkout,
 * and lands on the confirmation page.
 *
 * Pattern:
 *   1. Seed → login → add item via helper command
 *   2. Open cart → assert items rendered
 *   3. Fill every checkout form section
 *   4. Submit checkout → verify redirect to /booking-confirmation
 */

describe('Cart & Checkout', () => {
  before(() => {
    cy.task('seedDb');
  });

  beforeEach(() => {
    cy.login('user1', 'testpassword');
    cy.clearCartApi();
  });

  // ---------- Cart display ----------

  it('shows empty state when cart has no items', () => {
    cy.visit('/experiences');
    cy.getByTestId('cart-fab').should('not.exist'); // hidden when 0 items
  });

  it('displays cart items after adding via UI', () => {
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

    // Cart modal opens automatically with the item
    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-item-card').should('have.length', 1);
    cy.getByTestId('cart-item-card__title').first().should('not.be.empty');
    cy.getByTestId('cart-modal__total').invoke('text').should('match', /\$\d+\.\d{2}/);
  });

  it('removes an item from the cart', () => {
    cy.intercept('POST', '**/api/cart/items').as('addToCart');
    cy.intercept('DELETE', '**/api/cart/items/*').as('removeItem');

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

    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-item-card__remove').first().click();
    cy.wait('@removeItem');

    cy.getByTestId('cart-modal__empty').should('contain.text', 'Your cart is empty');
  });

  // ---------- Checkout validation ----------

  it('shows validation errors when checkout form is incomplete', () => {
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

    // Cart is open — clear required fields
    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-modal__contact-name').clear();
    cy.getByTestId('cart-modal__contact-phone').clear();
    cy.getByTestId('cart-modal__contact-email').clear();

    // Leave payment fields empty and click checkout
    cy.getByTestId('cart-modal__checkout-btn').click();

    // Validation errors should appear (Required texts next to fields)
    cy.getByTestId('cart-modal').should('contain.text', 'Required');
  });

  // ---------- Full checkout flow ----------

  it('completes checkout and navigates to confirmation page', () => {
    cy.intercept('POST', '**/api/cart/items').as('addToCart');
    cy.intercept('POST', '**/api/cart/checkout').as('checkout');

    // Step 1: Add item to cart
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

    // Step 2: Cart modal opens — fill checkout forms
    cy.getByTestId('cart-modal').should('be.visible');

    // Contact (may be pre-filled from user profile — clear and re-fill for determinism)
    cy.getByTestId('cart-modal__contact-name').clear().type('Test User');
    cy.getByTestId('cart-modal__contact-phone').clear().type('5551234567');
    cy.getByTestId('cart-modal__contact-email').clear().type('testuser@example.com');

    // Billing
    cy.getByTestId('cart-modal__billing-address').clear().type('123 Main St');
    cy.getByTestId('cart-modal__billing-city').clear().type('Test City');
    cy.getByTestId('cart-modal__billing-state').clear().type('TS');
    cy.getByTestId('cart-modal__billing-zip').clear().type('12345');

    // Payment
    cy.getByTestId('cart-modal__payment-name').clear().type('Test User');
    cy.getByTestId('cart-modal__payment-card').clear().type('4242424242424242');
    cy.getByTestId('cart-modal__payment-expiry').clear().type('1228');
    cy.getByTestId('cart-modal__payment-cvc').clear().type('123');

    // Step 3: Submit checkout
    cy.getByTestId('cart-modal__checkout-btn').click();
    cy.wait('@checkout').its('response.statusCode').should('eq', 201);

    // Step 4: Verify redirect to confirmation page
    cy.url().should('include', '/booking-confirmation');
    cy.getByTestId('confirmation__heading').should('contain.text', 'Booking Confirmed');
    cy.getByTestId('confirmation__order-number').should('not.be.empty');
    cy.getByTestId('confirmation__status').should('be.visible');
    cy.getByTestId('confirmation__total').invoke('text').should('match', /\$\d+\.\d{2}/);
  });
});
