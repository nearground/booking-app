const viewports = [
  [360, 740], [390, 844], [844, 390], [673, 841],
  [768, 1024], [1024, 768], [1280, 800], [1920, 1080],
];
const photo = '/video/tacos-hero-poster.jpg';
const longText = 'LongUnbrokenReviewText'.repeat(12);
const comments = Array.from({ length: 13 }, (_, index) => ({
  id: 700 + index,
  stars: 5,
  title: longText,
  comment: longText,
  createdAt: '2026-10-26T12:00:00Z',
  anonymity: 2,
  commenter: { id: 42, firstName: longText, city: longText },
  target: { type: 'experience', id: 9001, name: longText },
  images: [{ imageUrl: photo, imageKey: 'users/42/review-image/test.jpg' }],
  repliesCount: index === 0 ? 2 : 0,
}));

const stubExperience = (authenticated = false) => {
  cy.intercept('GET', '**/api/users/auth-user', {
    body: { errors: [], data: { isAuthenticated: authenticated, userDetails: authenticated ? { id: 42, firstName: longText } : {} } },
  });
  cy.intercept('GET', '**/api/comments/eligibility*', { body: { eligible: true, recentReview: null } });
  cy.intercept('GET', '**/api/experiences/9001', {
    body: { errors: [], data: {
      id: 9001, experienceCode: 9001, title: 'Responsive review fixture', description: 'Layout test fixture.',
      images: [], price: '10.00', ratings: 5, organizers: [], comments, commentCount: comments.length,
    } },
  });
  cy.intercept('GET', '**/api/comments/parent/*/replies*', {
    body: { errors: [], data: { elements: [{
      id: 999, ParentId: 700, comment: longText, commenter: { firstName: longText },
      createdAt: '2026-10-26T12:00:00Z',
    }] } },
  });
  cy.visit('/experience/9001');
  cy.getByTestId('experience-details__title').should('be.visible');
};

const assertFits = (selector) => {
  cy.get(selector).first().should('be.visible').should(($element) => {
    const element = $element[0];
    expect(element.scrollWidth).to.be.at.most(element.clientWidth + 1);
  });
  cy.document().should((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
  });
};

const assertTouchTargets = (selector) => {
  cy.get(selector).each(($button) => {
    const rect = $button[0].getBoundingClientRect();
    expect(rect.width, $button.text()).to.be.at.least(44);
    expect(rect.height, $button.text()).to.be.at.least(44);
  });
};

describe('responsive comments presentation (controlled API fixtures)', () => {
  viewports.forEach(([width, height]) => {
    it(`fits threads, photos and nested review dialogs at ${width}x${height}`, () => {
      cy.viewport(width, height);
      stubExperience();
      cy.getByTestId('comment-card').first().scrollIntoView();
      assertFits('[data-testid="comment-card"]');
      cy.contains('button', 'Show All Reviews').click();
      assertFits('[role="dialog"][aria-label="All comments"]');
      assertTouchTargets('[role="dialog"][aria-label="All comments"] button');
      cy.get('[role="dialog"][aria-label="All comments"] [aria-label="Open review photo 1"]').first().click();
      cy.get('[aria-label="Image gallery"]').should('be.visible');
      cy.get('[aria-label="Image gallery"] img').first().click();
      assertFits('[aria-label="Image lightbox"]');
      assertTouchTargets('[aria-label="Image lightbox"] button');
      cy.focused().trigger('keydown', { key: 'Escape' });
      cy.get('[aria-label="Image gallery"]').should('be.visible');
      cy.get('[aria-label="All comments"]').should('be.visible');
      cy.focused().trigger('keydown', { key: 'Escape' });
      cy.get('[aria-label="Image gallery"]').should('not.exist');
      cy.get('[aria-label="All comments"]').should('be.visible');
      cy.get('[aria-label="Close comments"]').click();
      cy.contains('button', 'Show All Reviews').should('have.focus');
    });
  });

  [[360, 420], [844, 390], [1280, 800]].forEach(([width, height]) => {
    it(`keeps composer, photo removal and save reachable at ${width}x${height}`, () => {
      cy.viewport(width, height);
      stubExperience(true);
      cy.intercept('PUT', '**/api/comments/700', { body: { errors: [], data: { id: 700 } } }).as('updateReview');
      cy.getByTestId('comment-card').first().within(() => {
        cy.contains('button', 'Edit').click();
        cy.get('textarea').scrollIntoView();
        cy.get('textarea').clear();
        cy.get('textarea').type('Updated from the narrow viewport');
        cy.get('[aria-label="Remove attached image"]').click();
        cy.contains('button', 'Update').scrollIntoView();
        cy.contains('button', 'Update').should('be.visible');
        assertTouchTargets('button');
        cy.contains('button', 'Update').click();
      });
      cy.wait('@updateReview').its('request.body').should('include', { comment: 'Updated from the narrow viewport' })
        .and('have.property', 'images').and('deep.eq', []);
      cy.get('textarea').first().scrollIntoView();
      cy.get('textarea').first().should('be.visible');
      assertFits('form');
    });
  });
});
