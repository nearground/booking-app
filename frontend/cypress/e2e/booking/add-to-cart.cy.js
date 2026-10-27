/// <reference types="cypress" />

/**
 * E2E: Add To Cart
 *
 * Validates the complete flow of adding items to cart:
 * booking modal → Add To Cart → cart opens with items, FAB badge.
 */
describe('Add To Cart', () => {
  before(() => {
    cy.task('seedDb');
  });

  beforeEach(() => {
    cy.login('user1', 'testpassword');
  });

  it('adds an item to cart and opens the cart modal', () => {
    cy.intercept('POST', '**/api/cart/items').as('addToCart');

    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('experience-details__title').should('be.visible');

    // Select first session
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');

    // Select 1 ticket on the first tier
    cy.getByTestId('tier-selector')
      .first()
      .find('[aria-label*="Increase"]')
      .click();

    // Fill required phone
    cy.getByTestId('contact-form__phone').clear().type('5551234567');

    // Click Add To Cart
    cy.getByTestId('session-summary__add-to-cart').click();

    // Wait for the API call
    cy.wait('@addToCart').its('response.statusCode').should('be.oneOf', [200, 201]);

    // Booking modal should close
    cy.getByTestId('booking-modal').should('not.exist');

    // Cart modal should open with the item
    cy.getByTestId('cart-modal').should('be.visible');
    cy.getByTestId('cart-item-card').should('have.length.at.least', 1);
  });

  it('shows CartFAB with correct badge after closing cart', () => {
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

    // Cart modal opens automatically — close it
    cy.getByTestId('cart-modal').should('be.visible');
    cy.get('body').click(0, 0); // Click outside to close

    // CartFAB should now be visible with a badge
    cy.getByTestId('cart-fab').should('be.visible');
    cy.getByTestId('cart-fab__badge').should('be.visible');
  });

  it('prevents adding when no tickets are selected', () => {
    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');

    // Do not select any tickets
    cy.getByTestId('session-summary__add-to-cart').should('be.disabled');
  });

  it('intercepts the cart API request with correct payload shape', () => {
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

    cy.wait('@addToCart').then(({ request }) => {
      expect(request.body).to.have.property('ProductType', 'Experience');
      expect(request.body).to.have.property('quantity');
      expect(request.body).to.have.property('metadata');
      expect(request.body.metadata).to.have.property('mainContact');
      expect(request.body.metadata.mainContact).to.have.property('phone', '5551234567');
    });
  });
});
