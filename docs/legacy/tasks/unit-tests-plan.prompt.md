## Plan: Unit Tests (Backend + Frontend)

TL;DR - add a lightweight, maintainable unit-test infra: use Jest + Supertest for backend (Node/Express/Sequelize) and Vitest + React Testing Library + MSW for frontend (Vite/React). Start with small, high-value unit tests for pure utils, hooks, simple components, and a few backend validation/notification units. Configure test scripts, setup files, and CI hooks. I can implement these changes after you approve.

**Steps**
1. Discovery (done): repo has Cypress E2E in `frontend` but no dedicated unit-test infra in `backend`; frontend uses Vite and already has testing-library dependency. (See relevant files below.)
2. Add dev dependencies and scripts (separate frontend/backend installs):
   - Backend: install `jest@^29`, `supertest`, and optional helpers (`jest-mock-extended`, `sinon`) and add a `test` script in `backend/package.json`.
   - Frontend: install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `msw` and add `test:unit` / `test:unit:ci` scripts in `frontend/package.json`.
3. Add config and setup files:
   - Backend: `backend/jest.config.cjs` + `backend/test/setup.js` (handle ESM-compatible Jest configuration; set `testEnvironment: 'node'`, `extensionsToTreatAsEsm` or an equivalent solution).
   - Frontend: `frontend/vitest.config.mjs` (or add to `vite.config.mjs`) + `frontend/src/setupTests.js` to register `@testing-library/jest-dom` and MSW handlers.
4. Create test utilities:
   - `backend/test/utils/mock-db.js` to mock Sequelize model calls (or use `jest.spyOn` on model methods).
   - `frontend/src/test-utils/` with `renderWithProviders` helpers and MSW handlers to mock API responses.
5. Implement prioritized unit tests (first-pass set) listed below.
6. Add basic CI steps (GitHub Actions / other CI): run `backend` unit tests and `frontend` unit tests separately; keep Cypress E2E as a separate workflow/stage.
7. Verification and coverage: add lightweight coverage thresholds and a `test:ci` command for headless runs.

**Relevant files**
- `backend/package.json` — current scripts: [backend/package.json](backend/package.json)
- `frontend/package.json` — current scripts (Cypress): [frontend/package.json](frontend/package.json)
- Cypress examples: [frontend/cypress/e2e/HomepageTest.cy.js](frontend/cypress/e2e/HomepageTest.cy.js)
- Backend candidates: [backend/server/utils/validators.js](backend/server/utils/validators.js), [backend/server/services/Notification.service.js](backend/server/services/Notification.service.js), [backend/server/utils/http-response.js](backend/server/utils/http-response.js), [backend/server/app.js](backend/server/app.js)
- Frontend candidates: [frontend/src/hooks/useOutsideClickHandler.js](frontend/src/hooks/useOutsideClickHandler.js), [frontend/src/components/image-card/ImageCard.jsx](frontend/src/components/image-card/ImageCard.jsx), [frontend/src/services/NetworkAdapter.js](frontend/src/services/NetworkAdapter.js), [frontend/src/utils/helpers.js](frontend/src/utils/helpers.js)

**Prioritized unit tests (first-pass)**
- Backend (high value, quick wins)
  1. `validators.validateEmail` and `validators.validatePhoneNumber` – pure function cases (valid/invalid). Source: [backend/server/utils/validators.js](backend/server/utils/validators.js)
  2. `validateUserInputs` – unit test key branches; mock `User.findOne` to simulate "email taken" and not-taken conditions.
  3. `sendError` behavior — assert JSON payload and HTTP status using a mocked `res` object. Source: [backend/server/utils/http-response.js](backend/server/utils/http-response.js)
  4. `Notification.service.resolveProvider` and `sendNotification` flows — test `console` and `disabled` providers, and `smtpProvider` behavior when env vars missing; mock `nodemailer.createTransport().sendMail` to simulate success/failure. Source: [backend/server/services/Notification.service.js](backend/server/services/Notification.service.js)
  5. One basic route-level test with `supertest` against a small express app instance or by importing route handlers (e.g., `PUT /api/users/register`) — focus on status and validation plumbing (mock DB). Source: [backend/server/routes/users.js](backend/server/routes/users.js)

- Frontend (high value, quick wins)
  1. `useOutsideClickHandler` — ensure callback fires when clicking outside and not when clicking inside. Source: [frontend/src/hooks/useOutsideClickHandler.js](frontend/src/hooks/useOutsideClickHandler.js)
  2. `ImageCard` — render output and ensure `onPopularDestincationCardClick` called on click. Source: [frontend/src/components/image-card/ImageCard.jsx](frontend/src/components/image-card/ImageCard.jsx)
  3. `helpers.isEmpty` — pure function tests. Source: [frontend/src/utils/helpers.js](frontend/src/utils/helpers.js)
  4. `NetworkAdapter` – unit-test `#normalizeEndpoint` validation, param serialization, and error returns for cross-origin or invalid inputs; mock global `fetch` for response parsing and error paths. Source: [frontend/src/services/NetworkAdapter.js](frontend/src/services/NetworkAdapter.js)
  5. (Optional) Small component rendering behaviors used in Cypress tests (pure UI aspects) to reduce brittle E2E coverage needs.

**Where to place tests**
- Backend: `backend/tests/unit/` or `backend/__tests__/` (choose one convention). Example: `backend/tests/unit/validators.test.js`.
- Frontend: `frontend/src/__tests__/` or `frontend/src/components/.../*.test.jsx` and `frontend/src/hooks/*.test.js`.

**Verification (commands)**
- Frontend unit tests (local):
  - `cd frontend` then `npm install` then `npm run test:unit` (or `npx vitest`).
  - CI-friendly: `npm run test:unit:ci` -> `vitest --run --coverage`.
- Backend unit tests (local):
  - `cd backend` then `npm install` then `npm test` (runs Jest with `--runInBand`/CI flags as configured).

**Estimated effort (first-pass, conservative)**
- Setup test infra and config files (backend + frontend): 2–4 hours
- Implement the prioritized unit tests above (approx. 10 tests backend + 6 tests frontend): 6–12 hours
- CI integration and coverage: 1–2 hours
- Total: 9–18 hours depending on ESM/Jest friction and mocking complexity.

**Decisions & assumptions**
- Recommend `Vitest` for frontend because the project uses Vite; it integrates smoothly with React Testing Library and MSW.
- Recommend `Jest` + `Supertest` for backend for broad community support; note: Node ESM (`type: module`) requires small Jest config adjustments — I will include config examples if you want me to implement.
- Cypress stays for E2E; unit tests aim to reduce E2E surface area and speed feedback loops.
- Tests should avoid heavy DB dependence; prefer mocking Sequelize model calls for unit tests and leave real DB-backed integration tests for separate CI jobs.

**Verification checklist**
1. Add test scripts to package.json files in `frontend` and `backend`.
2. Add `vitest` and `jest` config + setup files.
3. Commit initial test files for 3–5 quick wins (validators, one service, one hook, one component).
4. Run `npm run test` / `npm run test:unit` locally to validate.
5. Add a minimal CI job to run unit tests on PRs.

**Open questions (pick one so I can finalize scope)**
1. Priority: which to implement first — `backend`, `frontend`, or `both`? (recommended: `backend` validators + notification first)
2. Do you want me to implement the configs + 1–2 example tests now, or stop at this plan?

If you confirm priority and implementation preference I will (next) produce the exact `npm` commands, config file contents, and 2–3 starter test files ready to add.