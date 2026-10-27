/// <reference types="cypress" />

/**
 * E2E: Booking Confirmation Page
 *
 * After a successful checkout, the user lands on /booking-confirmation with
 * order details passed via router state. This spec validates the confirmation
 * page renders all critical information.
 */
describe('Booking Confirmation', () => {
  before(() => {
    cy.task('seedDb');
  });

  /**
   * Complete a full checkout before each test so we land on the confirmation page.
   * This is intentionally verbose to be self-contained — each test starts fresh.
   */
  beforeEach(() => {
    cy.login('user1', 'testpassword');
    cy.clearCartApi();

    cy.intercept('POST', '**/api/cart/items').as('addToCart');
    cy.intercept('POST', '**/api/cart/checkout').as('checkout');

    // Add item
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

    // Fill checkout
    cy.getByTestId('cart-modal').should('be.visible');
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
    cy.wait('@checkout');

    // Now on /booking-confirmation
    cy.url().should('include', '/booking-confirmation');
  });

  it('displays the confirmation heading', () => {
    cy.getByTestId('confirmation__heading').should('contain.text', 'Booking Confirmed');
  });

  it('shows the order number in ORD- format', () => {
    cy.getByTestId('confirmation__order-number')
      .invoke('text')
      .should('match', /ORD-\d{8}-[A-Z0-9]+/);
  });

  it('shows a status badge', () => {
    cy.getByTestId('confirmation__status')
      .should('be.visible')
      .invoke('text')
      .should('not.be.empty');
  });

  it('displays the order total', () => {
    cy.getByTestId('confirmation__total')
      .invoke('text')
      .should('match', /\$\d+\.\d{2}/);
  });

  it('has a back-to-bookings link', () => {
    cy.getByTestId('confirmation__back-link')
      .should('be.visible')
      .should('have.attr', 'href')
      .and('include', 'user-profile');
  });
});
