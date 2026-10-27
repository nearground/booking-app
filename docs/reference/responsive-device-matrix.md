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

The Cypress viewport spec visits home, experience browse, a real seeded experience detail, populated cart, checkout, receipt, login/register, authenticated organizer profile, and public organization profile at every matrix size. It discovers experience IDs after reseeding rather than relying on stale IDs. Cart cases add a real ticket via the booking UI and check close/checkout controls. Organizer cases use a cached admin login, not a login-page redirect.

Checkout and receipt matrix cases supply explicit router-state layout fixtures so the actual form and confirmation render rather than redirecting to browse. They do not claim to execute payments or generate orders. Separate live booking/guest-checkout suites create real orders and verify receipts. The matrix reseeds development data and mutates anonymous carts; run only against a disposable development database.

For manual overlay checks, verify the overlay fits the visible dynamic viewport (`dvh`), content scrolls internally, safe-area insets leave controls reachable, and Escape/backdrop/close actions work. Also test a virtual keyboard on a real phone if available; emulated viewport reduction is not physical-device certification.

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

The configured base URL is `http://localhost:8080`. Use the development Compose stack with seeded experiences and generated sessions. The seed task also refreshes sessions and clears development Redis.

## Comments and reduced viewport height

`frontend/cypress/e2e/responsive/comments-viewport.cy.js` supplies controlled API fixtures with long unbroken review text, names, threads and photo references. At all eight sizes it checks card/dialog overflow, >=44px actions, nested photo-gallery/lightbox dismissal, and focus restoration. Three additional cases edit a review, remove a photo and submit at 360x420 (reduced keyboard-sized height), 844x390 and 1280x800. Submission payload checks preserve the canonical media contract; these layout fixtures do not replace backend authorization or live booking tests.

Comment composers remain in normal scroll flow, with no fixed-height reply clipping. Photo removal controls stay inside thumbnail bounds. Nested dialogs use the shared focus helper and restore their scroll lock on unmount. Physical keyboard, notch and LAN testing remain manual launch checks.
