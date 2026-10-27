/// <reference types="cypress" />

/**
 * E2E: Session Selection
 *
 * Validates the schedule widget on an experience detail page:
 * sessions render, calendar works, pagination works, modal opens.
 */
describe('Session Selection', () => {
  before(() => {
    cy.task('seedDb');
  });

  beforeEach(() => {
    // Navigate to the first experience — pick one dynamically from the listing
    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('schedule-widget').should('be.visible');
  });

  it('displays scheduled sessions with dates and spot counts', () => {
    cy.getByTestId('session-card').should('have.length.at.least', 1);
    cy.getByTestId('session-card').first().should('contain.text', 'spots');
  });

  it('toggles the calendar when the calendar button is clicked', () => {
    // Calendar should be hidden initially
    cy.get('.custom-calendar').should('not.exist');

    cy.getByTestId('schedule-widget__calendar-btn').click();
    cy.get('.custom-calendar').should('be.visible');

    cy.getByTestId('schedule-widget__calendar-btn').click();
    cy.get('.custom-calendar').should('not.exist');
  });

  it('paginates sessions with prev/next buttons', () => {
    // Next button should be enabled if there are enough sessions
    cy.getByTestId('schedule-widget__next').then(($btn) => {
      if (!$btn.prop('disabled')) {
        // Capture first session text
        cy.getByTestId('session-card')
          .first()
          .invoke('text')
          .then((firstPageText) => {
            cy.getByTestId('schedule-widget__next').click();

            // After navigating, the first session text should differ
            cy.getByTestId('session-card')
              .first()
              .invoke('text')
              .should('not.eq', firstPageText);

            // Go back
            cy.getByTestId('schedule-widget__prev').click();
            cy.getByTestId('session-card')
              .first()
              .invoke('text')
              .should('eq', firstPageText);
          });
      }
    });
  });

  it('opens the booking modal when a session is clicked', () => {
    cy.getByTestId('session-card').first().click();
    cy.getByTestId('booking-modal').should('be.visible');
    cy.getByTestId('booking-modal__title').should('not.be.empty');
  });
});
