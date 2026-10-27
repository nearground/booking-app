# Responsive device and viewport matrix

This matrix is the layout coverage target for customer-facing routes. Dimensions are CSS viewport pixels, not physical-device pixel counts. Cypress sets these viewport sizes in `frontend/cypress/e2e/responsive/responsive-viewport.cy.js`.

| Viewport | Orientation / purpose | Required checks |
| --- | --- | --- |
| 360 × 740 | Compact phone, portrait baseline | No horizontal overflow; navigation, primary form controls, cards, and modal close/action targets fit. |
| 390 × 844 | Common phone, portrait | Same as compact phone; confirm comfortable content spacing and persistent shell controls. |
| 844 × 390 | Phone, landscape | No clipped header/actions; overlay body scrolls while close controls remain reachable. |
| 673 × 841 | Foldable inner display, portrait | Fluid card/container sizing; no forced tablet-width content. |
| 768 × 1024 | Tablet, portrait | Navigation and cards transition without excessive empty space or overflow. |
| 1024 × 768 | Tablet/small laptop, landscape | Columns fit; drawers and forms remain scrollable within visible height. |
| 1280 × 800 | Laptop baseline | Shared container and desktop navigation remain centered and usable. |
| 1920 × 1080 | Wide desktop | Content stays within the configured maximum container instead of stretching edge-to-edge. |

## Route smoke coverage

The Cypress viewport spec visits the app root (home redirect), experience browse, experience details, cart overlay when the populated-cart control is available, checkout, booking confirmation/receipt, login, register, and organizer profile. It checks the global menu control and app content root on every route, plus the login/register form controls. Protected organizer pages may redirect to login when the e2e user is unauthenticated; checkout and receipt may render empty-state or redirect when no booking context exists. These route checks are intentionally read-only and do not submit bookings or mutate account/cart state.

Cart and booking overlays are covered by their existing focused Cypress/component tests; the matrix conditionally opens the cart when the read-only app session already exposes its cart control because the application has no standalone cart route. For manual overlay checks, open the cart or booking dialog using the normal app flow and verify: the overlay is contained by the visible dynamic viewport (`dvh`), scroll remains inside the dialog, safe-area insets leave controls reachable, Escape/backdrop/close actions work, and keyboard focus stays in the active dialog. Also test a virtual keyboard open on a real phone if available.

## Accessibility and media checks

- Use keyboard Tab and Shift+Tab to verify visible focus and that modal focus wraps at its first/last control; Escape dismisses an active modal.
- Verify buttons and explicitly interactive touch controls are at least 44 CSS pixels in both dimensions.
- Enable `prefers-reduced-motion: reduce`; app transitions/animations should be effectively suppressed.
- Verify images reserve their layout aspect ratio before download. This app's current media pipeline does not expose responsive `srcset` variants, so this Epic sets stable presentation boxes without inventing image URLs.
- Verify content is not obscured by notches, home indicators, fixed cart controls, or the on-screen keyboard.

## Running the spec

From `frontend`, install dependencies and run:

```powershell
npx cypress run --e2e --spec "cypress/e2e/responsive/responsive-viewport.cy.js"
```

The configured base URL is `http://localhost:3000`. To run against the shared main checkout at port 8080 as a read-only baseline, set `CYPRESS_baseUrl=http://localhost:8080`; that does not validate the responsive worktree changes. Otherwise run the worktree Vite server on port 3300 with strict port binding and stop it after Cypress exits.

Comments presentation checks are deferred until the comment-photo-editing branch merges; do not interpret this matrix document as evidence those comment surfaces have been implemented.
