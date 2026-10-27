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
  { name: 'experience details', path: '/experience/1' },
  { name: 'cart overlay when populated', path: '/experiences', cartOverlay: true },
  { name: 'checkout', path: '/checkout?bookingType=experience' },
  { name: 'receipt', path: '/booking-confirmation' },
  { name: 'login', path: '/login', control: 'input[name="username"]' },
  { name: 'register', path: '/register', control: 'input[name="email"]' },
  { name: 'organizer profile', path: '/organizer-profile' },
];

describe('responsive viewport matrix', () => {
  viewports.forEach(({ name: viewportName, width, height }) => {
    describe(`${viewportName} (${width}x${height})`, () => {
      beforeEach(() => {
        cy.viewport(width, height);
      });

      routes.forEach(({ name: routeName, path, control, cartOverlay }) => {
        it(`keeps ${routeName} content and key controls in the viewport`, () => {
          cy.visit(path, { failOnStatusCode: false });
          let openedCart = false;
          if (cartOverlay) {
            cy.get('body').then(($body) => {
              if ($body.find('[data-testid="cart-fab"]').length) {
                openedCart = true;
                cy.get('[data-testid="cart-fab"]').click();
              }
            });
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
          assertWithinViewport('[data-testid="menu-toggle__button"]', true);
          if (openedCart) {
            cy.get('[data-testid="cart-modal"]').should('be.visible');
            assertWithinViewport('[data-testid="cart-modal"] button[aria-label="Close cart"]', true);
          }
          if (control) {
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
