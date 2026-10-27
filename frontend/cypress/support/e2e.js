// ***********************************************************
// E2E support file — loaded automatically before every spec.
// ***********************************************************

import './commands';

// Only ignore explicitly known, non-actionable uncaught exceptions.
// All other app exceptions should fail the test so regressions are visible.
const ignoredUncaughtExceptionPatterns = [
  // Currently no known patterns; all uncaught exceptions will fail tests.
  // Add narrowly scoped RegExp entries here only for documented, known-safe errors.
];

Cypress.on('uncaught:exception', (err) => {
  const message = err && err.message ? err.message : '';

  if (ignoredUncaughtExceptionPatterns.some((pattern) => pattern.test(message))) {
    return false;
  }

  return true;
});