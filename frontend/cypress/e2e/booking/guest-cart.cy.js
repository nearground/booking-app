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
    cy.answerBookingQuestionnaire();
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

    cy.getByTestId('cart-modal__save-booking').should('be.checked');
    cy.getByTestId('cart-modal__checkout-btn').click();
    cy.wait('@checkout').then(({ request, response }) => {
      expect(response.statusCode).to.eq(201);
      expect(request.body.saveBookingForLater).to.eq(true);
      expect(response.body.data.saveBookingForLater).to.eq(true);
    });
    cy.url().should('include', '/booking-confirmation');
    cy.getByTestId('confirmation__heading').should('contain.text', 'Booking Confirmed');
    cy.contains('Create an optional account').should('be.visible');
  });

  it('lets guests opt out of future linking while keeping their receipt and account creation option', () => {
    cy.intercept('POST', '**/api/cart/checkout').as('checkout');
    addExperienceToCart();
    fillCheckout('Guest User', 'opted-out@example.invalid');
    cy.getByTestId('cart-modal__save-booking').should('be.checked');
    cy.getByTestId('cart-modal__save-booking').uncheck();
    cy.getByTestId('cart-modal__checkout-btn').click();
    cy.wait('@checkout').then(({ request, response }) => {
      expect(response.statusCode).to.eq(201);
      expect(request.body.saveBookingForLater).to.eq(false);
      expect(response.body.data.saveBookingForLater).to.eq(false);
      expect(response.body.data.guestReceiptToken).to.be.a('string');
    });
    cy.getByTestId('confirmation__heading').should('contain.text', 'Booking Confirmed');
    cy.contains('You chose not to link this booking').should('be.visible');
    cy.contains('Create an optional account').click();
    cy.get('input[name="email"]').should('have.value', 'opted-out@example.invalid');
  });

  it('supports optional account registration, verified login, and claimed-booking visibility', () => {
    cy.intercept('POST', '**/api/cart/checkout').as('checkout');
    cy.intercept('PUT', '**/api/users/register', {
      statusCode: 201,
      body: { errors: [], data: { status: 'User created successfully' } },
    }).as('register');
    cy.intercept('POST', '**/api/users/email-verification/confirm', {
      body: { errors: [], data: { valid: true, claimedOrderCount: 1 } },
    }).as('verifyEmail');
    cy.intercept('POST', '**/api/users/login', {
      body: { errors: [], data: { token: 'e2e-token' } },
    }).as('login');
    cy.intercept('GET', '**/api/users/auth-user', {
      body: { errors: [], data: { isAuthenticated: true, userDetails: { id: 9001, username: 'guest-account' } } },
    });
    cy.intercept('GET', '**/api/users/payment-methods', { body: { errors: [], data: { elements: [] } } });
    cy.intercept('GET', '**/api/orders', {
      body: { errors: [], data: { orders: [{ id: 1, orderNumber: 'ORD-CLAIMED-E2E', status: 'confirmed', totalAmount: 25, createdAt: '2026-01-01', Items: [] }] } },
    });
    cy.intercept('GET', '**/api/comments/sent/9001*', { body: { errors: [], data: { elements: [] }, metadata: {} } });

    addExperienceToCart();
    fillCheckout('Guest User', 'guest-account@example.com');
    cy.getByTestId('cart-modal__checkout-btn').click();
    cy.wait('@checkout').its('response.statusCode').should('eq', 201);
    cy.contains('Create an optional account').click();
    cy.get('input[name="email"]').should('have.value', 'guest-account@example.com');
    cy.get('input[name="firstName"]').type('Guest');
    cy.get('input[name="lastName"]').type('Account');
    cy.get('input[name="username"]').type('guest-account');
    cy.get('input[name="phoneNumber"]').type('5551234567');
    cy.get('#country').type('Mexico{enter}');
    cy.get('input[name="password"]').type('GuestPass123!');
    cy.get('input[name="confirmPassword"]').type('GuestPass123!');
    cy.contains('button', 'Register').click();
    cy.wait('@register').its('response.statusCode').should('eq', 201);

    cy.visit('/verify-email?token=single-use-e2e-token');
    cy.wait('@verifyEmail');
    cy.contains('Email verified').should('be.visible');
    cy.contains('Log in to view bookings').click();
    cy.get('input[name="username"]').clear().type('guest-account');
    cy.get('input[name="password"]').clear().type('GuestPass123!');
    cy.contains('button', 'Log In').click();
    cy.wait('@login');
    cy.location('pathname').should('eq', '/user-profile');
    cy.contains('Welcome!').should('be.visible');
    cy.contains('button', 'Bookings').click();
    cy.contains('ORD-CLAIMED-E2E').should('be.visible');
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