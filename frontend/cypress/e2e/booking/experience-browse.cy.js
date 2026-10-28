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
    cy.task('seedCatalog').then((experiences) => {
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

  it('links from the host section to the experience organization profile on the current host', () => {
    cy.getByTestId('experience-card').first().click();
    cy.getByTestId('experience-details__organization-link')
      .should('have.attr', 'href')
      .and('match', /^\/o\/[a-z0-9-]+$/);
    cy.getByTestId('experience-details__organization-link').click();
    cy.location('pathname').should('match', /^\/o\/[a-z0-9-]+$/);
    cy.location('hostname').should('eq', 'localhost');
    cy.get('.org-site-brand h1').should('be.visible');
  });

  [null, { name: 'No public profile', slug: null }, { name: 'Invalid profile', slug: 'admin' }].forEach((organization) => {
    it(`omits the profile link for ${organization?.name || 'a missing organization'}`, () => {
      cy.intercept('GET', /\/api\/experiences\/\d+$/, (req) => {
        delete req.headers['if-none-match'];
        delete req.headers['if-modified-since'];
        req.continue((res) => {
          res.body.data.Organization = organization;
        });
      });
      cy.getByTestId('experience-card').first().click();
      cy.getByTestId('experience-details__title').should('be.visible');
      cy.getByTestId('experience-details__organization-link').should('not.exist');
      cy.getByTestId('schedule-widget').should('be.visible');
    });
  });
});
