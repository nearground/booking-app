/// <reference types="cypress" />

describe('Guest Cart', () => {
  before(() => {
    cy.task('seedDb');
  });

  beforeEach(() => {
    cy.clearCookies();
  });

  const addExperienceToCart = () => {
    cy.intercept('POST', '**/api/cart/items').as('addToCart');
    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');
    cy.getByTestId('tier-selector').first().find('[aria-label*="Increase"]').click();
    cy.getByTestId('contact-form__phone').clear().type('5551234567');
    cy.getByTestId('session-summary__add-to-cart').click();
    cy.wait('@addToCart').its('response.statusCode').should('eq', 201);
    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-item-card').should('have.length.at.least', 1);
  };

  const fillCheckout = (name, email) => {
    cy.getByTestId('cart-modal__contact-name').clear().type(name);
    cy.getByTestId('cart-modal__contact-phone').clear().type('5551234567');
    cy.getByTestId('cart-modal__contact-email').clear().type(email);
    cy.getByTestId('cart-modal__billing-address').clear().type('123 Main St');
    cy.getByTestId('cart-modal__billing-city').clear().type('Test City');
    cy.getByTestId('cart-modal__billing-state').clear().type('TS');
    cy.getByTestId('cart-modal__billing-zip').clear().type('12345');
  };

  it('allows guests to add experience tickets to cart', () => {
    addExperienceToCart();
    cy.getCookie('_cart_session').should('exist');
  });

  it('completes guest checkout without requiring an account', () => {
    cy.intercept('POST', '**/api/cart/checkout').as('checkout');
    addExperienceToCart();
    fillCheckout('Guest User', 'guest@example.com');

    cy.getByTestId('cart-modal__checkout-btn').click();
    cy.wait('@checkout').its('response.statusCode').should('eq', 201);
    cy.url().should('include', '/booking-confirmation');
    cy.getByTestId('confirmation__heading').should('contain.text', 'Booking Confirmed');
    cy.contains('Create an optional account').should('be.visible');
  });

  it('preserves the guest cart after login and allows checkout', () => {
    cy.intercept('POST', '**/api/cart/checkout').as('checkout');
    addExperienceToCart();
    cy.get('[aria-label="Close cart"]').click();

    cy.login('user1', 'testpassword');
    cy.visit('/experiences');
    cy.getByTestId('cart-fab').should('be.visible').click();
    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-item-card').should('have.length.at.least', 1);
    fillCheckout('Test User', 'test@example.com');

    cy.getByTestId('cart-modal__checkout-btn').click();
    cy.wait('@checkout').its('response.statusCode').should('eq', 201);
    cy.url().should('include', '/booking-confirmation');
  });
});