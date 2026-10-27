/// <reference types="cypress" />

describe('Password reset and unique account emails', () => {
  const email = 'reset-e2e@example.invalid';
  const newPassword = 'UpdatedReset1!';

  before(() => {
    cy.task('passwordResetFixture', 'restore');
  });

  after(() => {
    cy.task('passwordResetFixture', 'restore');
  });

  beforeEach(() => {
    cy.clearCookies();
  });

  const requestReset = () => {
    cy.intercept('POST', '**/api/users/forgot-password').as('requestReset');
    cy.visit('/forgot-password');
    cy.get('input[name="email"]').type(email.toUpperCase());
    cy.get('button[type="submit"]').click();
    cy.wait('@requestReset', { timeout: 60000 }).its('response.statusCode').should('eq', 200);
    cy.contains('Recovery Email has been sent!').should('be.visible');
  };

  it('rejects duplicate email registration with a different username and email casing', () => {
    cy.register({
      firstName: 'Another',
      lastName: 'Customer',
      username: 'another-reset-user',
      email: `  ${email.toUpperCase()}  `,
      password: 'DuplicatePass1!',
      phoneNumber: '5551234567',
      country: 'Mexico',
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.errors).to.include('A user with this email already exists');
    });
    cy.task('passwordResetFixture', 'verifyUniqueEmail').should('eq', true);
  });

  it('requests a real token, resets through the UI, logs in, and rejects token reuse', () => {
    requestReset();
    cy.task('passwordResetFixture', 'read').then(({ url, token }) => {
      expect(url).to.eq(`http://localhost:8080/reset-password?token=${token}`);
      cy.intercept('POST', '**/api/users/reset-password').as('completeReset');
      cy.visit(url);
      cy.contains('Set New Password').should('be.visible');
      cy.get('input[placeholder="New Password"]').type(newPassword, { log: false });
      cy.get('input[placeholder="Confirm Password"]').type('Mismatch1!', { log: false });
      cy.get('button[type="submit"]').click();
      cy.contains('Passwords do not match.').should('be.visible');
      cy.get('input[placeholder="Confirm Password"]').clear();
      cy.get('input[placeholder="Confirm Password"]').type(newPassword, { log: false });
      cy.get('button[type="submit"]').click();
      cy.wait('@completeReset', { timeout: 60000 }).its('response.statusCode').should('eq', 200);
      cy.contains('Password Reset Successfully!').should('be.visible');

      cy.intercept('POST', '**/api/users/login').as('login');
      cy.contains('Go to Login').click();
      cy.get('input[name="username"]').clear();
      cy.get('input[name="username"]').type('reset-e2e');
      cy.get('input[name="password"]').clear();
      cy.get('input[name="password"]').type(newPassword, { log: false });
      cy.get('button[type="submit"]').click();
      cy.wait('@login').its('response.statusCode').should('eq', 200);
      cy.location('pathname').should('eq', '/user-profile');
      cy.logout();
      cy.request({
        method: 'POST',
        url: '/api/users/login',
        body: { username: 'reset-e2e', password: 'testpassword' },
        failOnStatusCode: false,
        log: false,
      }).its('status').should('eq', 404);
      cy.visit(url);
      cy.contains('Invalid Link').should('be.visible');
      cy.request({
        method: 'POST',
        url: '/api/users/reset-password',
        body: { token, newPassword: 'ReuseDenied1!' },
        failOnStatusCode: false,
        log: false,
      }).its('status').should('eq', 400);
    });
  });

  it('rejects expired and unknown reset links', () => {
    requestReset();
    cy.task('passwordResetFixture', 'expire').then(({ url, token }) => {
      cy.visit(url);
      cy.contains('Link Expired').should('be.visible');
      cy.request({
        method: 'POST',
        url: '/api/users/reset-password',
        body: { token, newPassword: 'ExpiredDenied1!' },
        failOnStatusCode: false,
        log: false,
      }).its('status').should('eq', 400);
    });
    cy.visit('/reset-password?token=unknown-reset-token');
    cy.contains('Invalid Link').should('be.visible');
  });
});
