/// <reference types="cypress" />

/**
 * E2E: Experience Browse
 *
 * Validates that the experiences listing page renders seeded experiences
 * and that clicking a card navigates to the detail page.
 */
describe('Experience Browse', () => {
  before(() => {
    cy.task('seedDb');
  });

  beforeEach(() => {
    cy.visit('/experiences');
  });

  it('renders seeded experience cards on the listing page', () => {
    cy.getByTestId('experience-card').should('have.length.at.least', 1);
  });

  it('displays known seeded experience titles', function () {
    cy.fixture('experiences').then((experiences) => {
      const titles = experiences.seededExperiences.map((e) => e.title);

      // At least one seeded title should appear
      cy.getByTestId('experience-card').then(($cards) => {
        const cardTexts = [...$cards].map((card) => card.textContent);
        const found = titles.filter((title) =>
          cardTexts.some((text) => text.includes(title))
        );
        expect(found.length).to.be.greaterThan(0);
      });
    });
  });

  it('navigates to experience detail page when a card is clicked', () => {
    cy.getByTestId('experience-card').first().click();
    cy.url().should('match', /\/experience\/\d+/);
    cy.getByTestId('experience-details__title').should('be.visible');
  });

  it('renders experience detail page with title, rating, and schedule widget', () => {
    cy.getByTestId('experience-card').first().click();

    cy.getByTestId('experience-details__title').should('not.be.empty');
    cy.getByTestId('experience-details__rating').should('be.visible');
    cy.getByTestId('schedule-widget').should('be.visible');
  });
});
