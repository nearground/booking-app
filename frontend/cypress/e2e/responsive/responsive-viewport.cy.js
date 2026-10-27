const viewports = [
  { name: 'compact phone portrait', width: 360, height: 740 },
  { name: 'phone portrait', width: 390, height: 844 },
  { name: 'phone landscape', width: 844, height: 390 },
  { name: 'foldable portrait', width: 673, height: 841 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'tablet landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'wide desktop', width: 1920, height: 1080 },
];

const assertWithinViewport = (selector, checkTouchTarget = false) => {
  cy.get(selector).first().should('be.visible').then(($element) => {
    cy.window().then((window) => {
      const rect = $element[0].getBoundingClientRect();
      expect(rect.left, `${selector} left edge`).to.be.at.least(0);
      expect(rect.top, `${selector} top edge`).to.be.at.least(0);
      expect(rect.right, `${selector} right edge`).to.be.at.most(window.innerWidth);
      expect(rect.bottom, `${selector} bottom edge`).to.be.at.most(window.innerHeight);
      if (checkTouchTarget) {
        expect(rect.width, `${selector} touch width`).to.be.at.least(44);
        expect(rect.height, `${selector} touch height`).to.be.at.least(44);
      }
    });
  });
};

const routes = [
  { name: 'home', path: '/' },
  { name: 'experience browse', path: '/experiences' },
  { name: 'experience details', experienceDetails: true, control: '[data-testid="experience-details__title"]' },
  { name: 'populated cart overlay', cartOverlay: true },
  { name: 'checkout', path: '/checkout?bookingType=experience', checkout: true },
  { name: 'receipt', path: '/booking-confirmation', receipt: true, control: '[data-testid="confirmation__heading"]' },
  { name: 'login', path: '/login', control: 'input[name="username"]' },
  { name: 'register', path: '/register', control: 'input[name="email"]' },
  { name: 'organizer profile', path: '/organizer-profile', organizer: true },
  { name: 'public organization profile', path: '/o/testcompany1', control: '.org-site-brand h1', publicOrganization: true },
];

describe('responsive viewport matrix', () => {
  let experiencePath;
  let bookingContext;
  const confirmationData = {
    orderNumber: 'ORD-VIEWPORT-FIXTURE', status: 'pending', totalAmount: '20.00',
    mainContactName: 'Viewport Guest', mainContactEmail: 'viewport@example.invalid',
    guestReceiptToken: 'layout-fixture-not-a-real-capability', saveBookingForLater: true,
    items: [{
      id: 1, ProductType: 'Experience', description: 'Viewport fixture tickets',
      quantity: 1, unitPrice: '20.00', totalPrice: '20.00',
      metadata: { experienceTitle: 'Viewport fixture experience', sessionDateTime: '2027-01-15T12:00:00Z' },
    }],
  };

  before(() => {
    cy.task('seedDb');
    cy.visit('/experiences');
    cy.getByTestId('experience-card').first().click();
    cy.location('pathname').then((path) => {
      experiencePath = path;
      cy.request(`/api/experiences/${path.split('/').pop()}`).then(({ body }) => {
        const tier = body.data.TicketTiers[0];
        bookingContext = {
          sessionDateTime: '2027-01-15T12:00:00Z', experienceTitle: body.data.title,
          totalTickets: 1, tickets: [{ ticketTierId: tier.id, quantity: 1 }],
          previewTicketTiers: body.data.TicketTiers,
        };
      });
    });
  });

  viewports.forEach(({ name: viewportName, width, height }) => {
    describe(`${viewportName} (${width}x${height})`, () => {
      beforeEach(() => {
        cy.viewport(width, height);
      });

      routes.forEach(({ name: routeName, path, control, cartOverlay, experienceDetails, checkout, receipt, organizer, publicOrganization }) => {
        it(`keeps ${routeName} content and key controls in the viewport`, () => {
          if (organizer) {
            cy.session('responsive-organizer', () => cy.login('admin', 'adminpassword'));
          }
          const targetPath = experienceDetails || cartOverlay ? experiencePath : path;
          const state = receipt ? { confirmationData } : checkout ? { bookingContext } : null;
          cy.visit(targetPath, {
            onBeforeLoad(window) {
              if (state) window.history.replaceState({ usr: state, key: 'viewport', idx: 0 }, '', targetPath);
            },
          });
          if (experienceDetails) cy.getByTestId('experience-details__title').should('be.visible');
          if (organizer) cy.contains('h2', 'Organizer Home').should('be.visible');
          if (checkout) cy.contains('Billing Section').should('exist');
          if (cartOverlay) {
            cy.getByTestId('session-card').first().click();
            cy.get('[aria-label="Close booking modal"]').should('have.focus');
            cy.getByTestId('tier-selector').first().find('[aria-label*="Increase"]').click();
            cy.getByTestId('contact-form__phone').clear();
            cy.getByTestId('contact-form__phone').type('5551234567');
            cy.answerBookingQuestionnaire();
            cy.getByTestId('session-summary__add-to-cart').focus();
            cy.focused().trigger('keydown', { key: 'Tab' });
            cy.get('[aria-label="Close booking modal"]').should('have.focus');
            cy.getByTestId('session-summary__add-to-cart').click();
            cy.getByTestId('cart-item-card').should('have.length', 1);
          }
          cy.get('#root').should('be.visible');
          cy.document().should((document) => {
            expect(document.documentElement.scrollWidth, 'document horizontal overflow').to.be.at.most(
              document.documentElement.clientWidth
            );
            expect(document.body.scrollWidth, 'body horizontal overflow').to.be.at.most(
              document.documentElement.clientWidth
            );
          });
          if (!cartOverlay && !publicOrganization) assertWithinViewport('[data-testid="menu-toggle__button"]', true);
          if (cartOverlay) {
            cy.get('[data-testid="cart-modal"]').should('be.visible');
            assertWithinViewport('[data-testid="cart-modal"] button[aria-label="Close cart"]', true);
            cy.getByTestId('cart-modal__checkout-btn').scrollIntoView();
            assertWithinViewport('[data-testid="cart-modal__checkout-btn"]', true);
            cy.getByTestId('cart-modal__checkout-btn').focus();
            cy.focused().trigger('keydown', { key: 'Tab' });
            cy.get('[data-testid="cart-modal"] button').first().should('have.focus');
            cy.focused().trigger('keydown', { key: 'Escape' });
            cy.getByTestId('cart-modal').should('not.exist');
            cy.document().its('body.style.overflow').should('not.eq', 'hidden');
          }
          if (control) {
            cy.get(`#root ${control}`).first().scrollIntoView({ offset: { top: -16, left: 0 } });
            assertWithinViewport(`#root ${control}`);
          }
        });
      });

      it('traps menu focus and restores it when dismissed', () => {
        cy.visit('/experiences', { failOnStatusCode: false });
        cy.get('[data-testid="menu-toggle__button"]').click();
        const menuControls = '[role="dialog"][aria-label="Site navigation"] a, [role="dialog"][aria-label="Site navigation"] button';
        cy.get(menuControls).last().focus();
        cy.focused().trigger('keydown', { key: 'Tab', code: 'Tab' });
        cy.get('[role="dialog"][aria-label="Site navigation"] a, [role="dialog"][aria-label="Site navigation"] button').first().should('have.focus');
        cy.get(menuControls).last().focus();
        cy.focused().trigger('keydown', { key: 'Escape', code: 'Escape' });
        cy.get('[data-testid="menu-toggle__button"]').should('have.attr', 'aria-expanded', 'false');
        cy.get('[data-testid="menu-toggle__button"]').should('have.focus');
      });
    });
  });
});
