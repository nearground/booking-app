/// <reference types="cypress" />

/**
 * E2E: Booking Modal
 *
 * Validates the booking modal form: ticket tier selection, price calculation,
 * contact form, validation, and session summary.
 */
describe('Booking Modal', () => {
  before(() => {
    cy.task('seedDb');
  });

  beforeEach(() => {
    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');
  });

  it('displays ticket tiers with prices', () => {
    cy.getByTestId('tier-selector').should('have.length.at.least', 1);
    cy.getByTestId('tier-selector')
      .first()
      .within(() => {
        cy.getByTestId('tier-selector__price').should('contain', '$');
        cy.getByTestId('tier-selector__quantity').should('contain', '0');
      });
  });

  it('increments and decrements ticket quantities', () => {
    cy.getByTestId('tier-selector')
      .first()
      .within(() => {
        // Increment
        cy.get('[aria-label*="Increase"]').click();
        cy.getByTestId('tier-selector__quantity').should('contain', '1');

        // Increment again
        cy.get('[aria-label*="Increase"]').click();
        cy.getByTestId('tier-selector__quantity').should('contain', '2');

        // Decrement
        cy.get('[aria-label*="Decrease"]').click();
        cy.getByTestId('tier-selector__quantity').should('contain', '1');
      });
  });

  it('updates total price when tickets are selected', () => {
    // Get the price from the first tier
    cy.getByTestId('tier-selector')
      .first()
      .find('[data-testid="tier-selector__price"]')
      .invoke('text')
      .then((priceText) => {
        const tierPrice = parseFloat(priceText.replace('$', ''));

        // Select 2 tickets
        cy.getByTestId('tier-selector')
          .first()
          .find('[aria-label*="Increase"]')
          .click()
          .click();

        // Verify total = 2 * tier price
        const expectedTotal = (tierPrice * 2).toFixed(2);
        cy.getByTestId('session-summary__total').should('contain', expectedTotal);
      });
  });

  it('shows spots remaining in the summary', () => {
    cy.getByTestId('session-summary__spots').should('contain', 'spots remaining');
  });

  it('shows the main contact form once tickets are selected', () => {
    // Contact form should not be visible before ticket selection
    cy.getByTestId('contact-form').should('not.exist');

    // Select a ticket
    cy.getByTestId('tier-selector')
      .first()
      .find('[aria-label*="Increase"]')
      .click();

    // Contact form should now be visible
    cy.getByTestId('contact-form').scrollIntoView().should('be.visible');
    cy.getByTestId('contact-form__phone').scrollIntoView().should('be.visible');
  });

  it('disables Add To Cart button when no tickets are selected', () => {
    cy.getByTestId('session-summary__add-to-cart').should('be.disabled');
  });

  it('shows validation error when submitting without phone', () => {
    // Select a ticket
    cy.getByTestId('tier-selector')
      .first()
      .find('[aria-label*="Increase"]')
      .click();

    // Clear phone field and try to submit
    cy.getByTestId('contact-form__phone').clear();
    cy.answerBookingQuestionnaire();
    cy.getByTestId('session-summary__add-to-cart').click();

    // Should show phone validation error
    cy.getByTestId('contact-form').should('contain.text', 'Phone number is required');
  });

  it('closes the modal when the close button is clicked', () => {
    cy.get('[aria-label="Close booking modal"]').click();
    cy.getByTestId('booking-modal').should('not.exist');
  });
});
