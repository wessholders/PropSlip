# PropSlip To-Do

- [x] Remove duplicated and legacy CSS from `public/index.html`.
- [x] Publish only deployable static assets instead of the repository root.
- [x] Add stronger production security headers, including CSP, HSTS, and frame protections.
- [x] Extract inline CSS and JS from `public/index.html` so CSP can remove `unsafe-inline`.
- [x] Add browser compatibility fallbacks for `color-mix()`, dynamic viewport sizing, and `<dialog>`.
- [x] Convert calculator switching to tab semantics.
- [x] Add explicit validation messages and accessible error states.
- [x] Narrow live-region announcements to the primary result/status values.
- [x] Add favicon, touch icon, canonical URL, Open Graph/Twitter metadata, `robots.txt`, and optional manifest.
- [x] Prevent accidental form submission on calculator forms.
- [x] Document verification prerequisites and run the render smoke test in CI.
- [x] Extract calculator formulas into shared logic with deterministic test vectors.
- [ ] Improve desktop layout for the two-calculator MVP.
- [ ] Decide Android package name, Play developer account type, and public developer name.
- [ ] Scaffold native Android project with Kotlin, Compose, and a pure calculator module.
- [ ] Port calculator contract to Kotlin and mirror the JavaScript formula test vectors.
- [ ] Build Android calculator UI without ads or billing.
- [ ] Add reserved non-live ad slot experiments before choosing an ad provider.
