# PropSlip Android Transition Plan

Last reviewed: July 26, 2026.

This plan is the working path from the current website MVP to an Android app that can later support ads and a paid no-ads purchase. It is intentionally practical: the goal is to avoid rework, keep the calculator trustworthy, and get to a testable Android build without turning a simple product into a big platform too early.

## Executive Decision

Start Android first, using native Kotlin and Jetpack Compose.

Reasons:

- Android has the cheaper store entry path than iOS.
- Android likely overlaps well with the early boating audience.
- Play Billing, AdMob, Data Safety, and closed testing are easier to handle directly in a native Android project than through an extra abstraction layer.
- The current site already has a shared formula contract, so Android can match the website without copying UI-bound JavaScript.

Flutter remains a reasonable future option if iOS needs to arrive quickly and share most UI code. For the next step, native Android is the better learning and launch path.

## Current Baseline

Already done:

- Website MVP is static and deployable from `public/`.
- Propeller Slip and Theoretical Setup calculators are the main product.
- Theoretical Setup comparison mode is optional and off by default.
- Calculator logic is extracted into `public/calculators.js`.
- Formula checks live in `scripts/verify-calculators.js`.
- Browser smoke checks live in `scripts/verify-render.mjs`.
- CI runs formula and render checks.
- Website support/compliance surfaces exist: Privacy, Accessibility, Terms, Contact, Mobile Apps, Settings.
- Monetization and long-term app notes live in `ROADMAP.md`.

This is enough to begin Android planning. It is not yet enough to add live ads or purchases.

## Product Shape For Android V1

V1 should be boring in the best way:

- One free Android app.
- No login.
- No saved cloud account.
- Same two calculators as the website.
- Same defaults and rounded outputs as the website.
- Same speed units: mph, km/h, and knots.
- Same appearance idea: light/dark/system.
- Contact, Privacy, Terms/Disclaimer, and Accessibility available inside the app.
- Ad architecture present, but live ads off until the app is stable.
- No-ads entitlement architecture present before live ads, but purchase flow can come after the first calculator-only build.

Avoid for V1:

- Accounts.
- Sync.
- User-generated content.
- Location permissions.
- Push notifications.
- Interstitial ads.
- App-open ads.
- Blog/resource browsing inside the app.

## Architecture Recommendation

Keep this as a monorepo:

```text
PropSlip/
  public/
    calculators.js
    app.js
    index.html
  scripts/
    verify-calculators.js
    verify-render.mjs
  android/
    settings.gradle.kts
    build.gradle.kts
    app/
    core-calculators/
```

Recommended Android modules:

- `android/core-calculators`: pure Kotlin calculator logic, no Android dependencies.
- `android/app`: Compose app, Android platform code, preferences, ads, billing, and app screens.

Why split calculator logic:

- It keeps formula tests fast.
- It prevents Android UI code from becoming the source of truth.
- It gives iOS a clean contract later.
- It allows one-to-one parity tests against the website test vectors.

## Android Technical Defaults

Use these as starting defaults, then verify exact versions before scaffolding:

- Language: Kotlin.
- UI: Jetpack Compose with Material 3.
- Minimum SDK: 23.
- Compile SDK: latest stable available locally, at least 35 for current Google Mobile Ads SDK guidance.
- Target SDK: latest Google Play requirement at launch. Current Play policy says new apps and updates must target Android 16/API 36 starting August 31, 2026.
- App package name: decide once and do not change after Play Console setup.
- Suggested package options:
  - `com.propslip.app`
  - `com.wessholders.propslip`

Do not create the Play Console app until the package name and developer identity are final.

## Calculator Contract

The Android app must reproduce these JavaScript functions in Kotlin:

- `speedToMph(speed, unit)`
- `speedFromMph(mph, unit)`
- `calculatePropRpm(rpm, gearRatio)`
- `calculateTheoreticalMph(pitch, gearRatio, rpm)`
- `calculateSlip({ pitch, gearRatio, rpm, speed, speedUnit })`
- `estimateSetup(pitch, gearRatio, rpm, slip)`

Kotlin data model draft:

```kotlin
enum class SpeedUnit { Mph, Kph, Knots }

data class SlipResult(
    val actualMph: Double,
    val propRpm: Double,
    val theoreticalMph: Double,
    val slipPercent: Double
)

data class SetupEstimate(
    val propRpm: Double,
    val theoreticalMph: Double,
    val estimatedMph: Double
)
```

Test vectors must match `scripts/verify-calculators.js`:

- Default slip: 24 pitch, 1.75 gear, 5600 RPM, 68 mph -> 6.5%.
- Setup A: 24 pitch, 1.75 gear, 5600 RPM, 10% slip -> 65.454545 mph estimated.
- Setup B: 26 pitch with same setup -> about 5.454545 mph faster than Setup A.
- Reverse comparison with 22 pitch -> about 5.454545 mph slower than Setup A.
- Unit conversions for knots and km/h.
- Invalid values return null or validation errors rather than producing misleading numbers.

## Android UI Plan

Use one Activity and Compose navigation only if the app grows. For V1, a simple stateful single-screen app is enough.

Screens and surfaces:

- Main calculator screen
  - Top app bar with PropSlip branding and menu/settings.
  - Segmented calculator tabs: Propeller Slip, Theoretical Setup.
  - Result panel.
  - Input fields.
  - Clear action.
  - Optional comparison toggle inside Theoretical Setup.
- Settings/help sheet or screen
  - Appearance: System, Light, Dark.
  - Speed unit system: Imperial, Metric, Nautical.
  - Contact.
  - Privacy.
  - Terms & Disclaimer.
  - App version.
- Future monetization surface
  - Remove Ads row.
  - Restore Purchases row.
  - Privacy options row if ads/consent require it.

State handling:

- Use a ViewModel for calculator state.
- Preserve active tab and current fields on rotation/process recreation.
- Use DataStore for appearance/unit preferences.
- Do not store calculation history in V1.

Accessibility:

- Numeric fields need labels and units.
- Result changes should be clear to screen readers without being noisy.
- Do not rely on red/green only; keep labels and values.
- Test font scaling.
- Test portrait, landscape, tablet-ish widths, and foldable/resizable behavior.

## Monetization Architecture

Build these flags and concepts before live ads:

```text
adsFeatureEnabled       build/config flag; false at first
adsCanRequest           consent/privacy state says ads may be requested
hasRemovedAds           purchase entitlement says ads should be hidden
shouldShowAds           adsFeatureEnabled && adsCanRequest && !hasRemovedAds
```

This prevents ad logic from leaking throughout the UI.

### Ads

Initial app ad strategy:

- Start with AdMob test banners only.
- Keep the banner away from high-touch calculator inputs and tab/navigation controls.
- Do not use floating, overlay, or moving banners.
- Do not use interstitial, rewarded, or app-open ads for V1.
- Load ads only after consent flow says ads can be requested.
- Add live AdMob IDs only after internal/closed tests are stable.

Likely placement:

- A reserved bottom area below the calculator content, with enough spacing from controls.
- On larger screens, a side or lower sponsor/ad area can be tested, but never between inputs and actions.

### Consent

Before requesting ads:

- Add UMP SDK.
- Request consent info at app launch.
- Show consent form if required.
- Provide a privacy options entry point when required.
- Keep privacy policy text and Play Data Safety declarations consistent with actual SDK behavior.

### No-Ads Purchase

Use one non-consumable one-time product:

```text
Product ID: remove_ads
Meaning: Permanently removes advertising from the Android app.
```

Purchase rules:

- Query existing purchases on app start/resume.
- Grant no-ads only when purchase state is purchased.
- Acknowledge purchases within the required window.
- Support restore through Play purchase query.
- Keep a local entitlement cache for startup, but refresh from Play Billing.
- Show purchase errors calmly; never block calculator use.

Backend:

- V1 can be client-only if there is no account system.
- A backend becomes more important if we need cross-platform entitlements, account restore across stores, fraud controls, or subscription features.

## Play Console And Launch Readiness

Decisions needed before creating the Play app:

- Developer account type: Personal or Organization.
- Public developer name.
- Package name.
- App name in store: likely `PropSlip`.
- Support email: `propslipsupport@gmail.com`.
- Website/privacy URL: current Render URL or future custom domain.

Important Play setup tasks:

- Pay Google Play registration fee if account does not exist.
- Complete developer identity verification.
- Create app in Play Console.
- Enable Play App Signing.
- Create internal testing track.
- Prepare privacy policy URL.
- Complete Data Safety form.
- Complete content rating questionnaire.
- Declare ads once ads are included.
- Declare target audience. This app should not be positioned as child-directed.
- Add store listing assets:
  - 512x512 app icon.
  - 1024x500 feature graphic.
  - Phone screenshots.
  - Optional tablet screenshots if large-screen support is polished.
  - Short description.
  - Full description.
  - Privacy policy URL.

Testing requirement:

- New personal developer accounts created after November 13, 2023 may need a closed test with at least 12 opted-in testers for 14 continuous days before production access.
- Start recruiting testers early from real likely users: boating friends, setup/tuning groups, and trusted Android users.

## Release Track Plan

1. Local debug build
   - Run unit tests.
   - Manually test core inputs and rotations.
   - No ads, no billing.

2. Internal test track
   - Install through Play.
   - Verify app signing/package identity.
   - Validate privacy/legal screens.
   - Add AdMob test banner only after core app works.

3. Closed test track
   - Recruit at least 12 testers if required.
   - Provide a tester script:
     - Try Propeller Slip.
     - Try Theoretical Setup.
     - Toggle comparison.
     - Change units.
     - Rotate screen.
     - Try dark mode.
     - Send feedback to support email.
   - Keep testers opted in for the full required window.

4. Monetization test
   - Use AdMob test ads.
   - Use Play Billing license testers.
   - Test purchase, restore, pending/canceled purchase, reinstall, and offline startup.

5. Production release
   - Start without aggressive monetization.
   - Enable low-density banners after policy/privacy review.
   - Add remove-ads purchase only when ads are live or nearly live.

## Phased Work Plan

### Phase 0: Website Landing Foundation

Goal: keep the web MVP credible while Android is built.

Tasks:

- Improve desktop calculator layout.
- Keep mobile behavior unchanged.
- Keep formula and render tests passing.
- Add a placeholder resources/blog entry point only when there is content.

Exit criteria:

- Website looks polished on mobile and desktop.
- Render deploy remains clean.
- Tests pass.

### Phase 1: Android Scaffold

Goal: create a buildable Android project with no monetization.

Tasks:

- Confirm Android Studio/JDK/Gradle environment.
- Add `android/` project.
- Add `core-calculators` pure Kotlin module.
- Add `app` Compose module.
- Configure version catalog.
- Add JUnit calculator parity tests.
- Add GitHub Actions Android build/test if feasible.

Exit criteria:

- Android project builds.
- Kotlin formula tests pass.
- No app UI yet beyond a placeholder screen.

### Phase 2: Calculator UI Parity

Goal: app users can use the same calculator workflows as the website.

Tasks:

- Build Propeller Slip tab.
- Build Theoretical Setup tab.
- Build comparison toggle and A/B results.
- Add validation messages.
- Add clear/reset behavior.
- Add unit settings.
- Add light/dark/system theme.
- Add legal/contact/settings screens.

Exit criteria:

- App calculator outputs match website test vectors.
- Rotation preserves useful state.
- No login required.
- Manual testing passes on at least two Android devices or emulator profiles.

### Phase 3: Store-Ready Free App

Goal: prepare for Play internal/closed testing without live ads.

Tasks:

- Finalize app icon and adaptive icon.
- Add app versioning.
- Add privacy policy URL in app and Play Console.
- Complete initial Data Safety based on no ads/no analytics state.
- Create store listing text and screenshots.
- Upload internal test build.

Exit criteria:

- App installs from Play internal test.
- No crashes in basic use.
- Privacy/legal surfaces are complete.

### Phase 4: Test Ads And Consent

Goal: add ad infrastructure safely without live monetization.

Tasks:

- Add UMP SDK.
- Add Google Mobile Ads SDK.
- Add test AdMob app ID and test banner ID.
- Add `shouldShowAds` gating.
- Add privacy options entry point if required.
- Update Data Safety and Privacy draft for ad SDK behavior.
- Test layout with banner reserved space.

Exit criteria:

- Test ads show only when allowed.
- Ads do not overlap or sit next to high-touch controls.
- No live ad IDs in debug/internal builds.

### Phase 5: Remove Ads Purchase

Goal: implement no-ads entitlement before live ad rollout.

Tasks:

- Create Play Console one-time product `remove_ads`.
- Add Play Billing Library.
- Query product details.
- Launch purchase flow.
- Query purchases on startup/resume.
- Acknowledge purchased non-consumable.
- Cache entitlement locally.
- Add Restore Purchases UI.
- Add license tester scenarios.

Exit criteria:

- Purchase hides ads.
- Restore works after reinstall.
- Failed/canceled/pending purchases do not break calculator use.

### Phase 6: Closed Test And Production

Goal: launch carefully, with real feedback.

Tasks:

- Recruit testers.
- Run closed test.
- Collect feedback themes.
- Fix top issues.
- Apply for production access if required.
- Enable production rollout.
- Watch vitals, reviews, support email, and policy center.

Exit criteria:

- Production release is approved.
- App is stable.
- Monetization can be tuned slowly.

## Risk Register

### Risk: Play account/testing delay

Impact: production launch can be delayed by closed testing requirements.

Mitigation:

- Create Play account early.
- Decide personal vs organization early.
- Recruit at least 12 testers before the app is ready.

### Risk: Formula drift between web and Android

Impact: users see different numbers across products.

Mitigation:

- Keep pure calculator modules.
- Mirror test vectors.
- Document rounding.
- Treat formula changes as contract changes.

### Risk: Ads hurt usability or policy standing

Impact: bad UX, accidental clicks, ad serving restrictions.

Mitigation:

- Start with test banners only.
- Reserve space.
- Keep ads away from controls.
- Avoid interstitials and app-open ads in V1.

### Risk: Purchase entitlement complexity

Impact: users pay but still see ads, or support burden grows.

Mitigation:

- Add purchase logic before live ads.
- Query and restore purchases on startup.
- Test license accounts heavily.
- Keep calculator free even when billing fails.

### Risk: Privacy disclosures become inaccurate

Impact: Play review or policy problems.

Mitigation:

- Update privacy policy and Data Safety each time SDK behavior changes.
- Delay analytics until there is a clear need.
- Keep permissions minimal.

### Risk: Android dependencies churn

Impact: build breaks or Play submission blocked.

Mitigation:

- Verify current SDK/Play requirements before adding dependencies.
- Use version catalog.
- Keep dependencies few: Compose, DataStore, UMP, Mobile Ads, Play Billing.

## Immediate Next Work

When work resumes, the best sequence is:

1. Desktop polish pass on the website.
2. Decide Android package name and Play developer account type.
3. Create `android/` project scaffold.
4. Translate calculator contract to Kotlin.
5. Add Kotlin test vectors matching `scripts/verify-calculators.js`.
6. Build Compose calculator UI without ads or billing.
7. Prepare Play Console internal test path.

## User Decisions Needed

Before scaffolding Android:

- Package name: `com.propslip.app` or another final value.
- Developer account type: Personal or Organization.
- Public developer name.
- Minimum Android support expectation. Recommended: min SDK 23.
- Whether to use `PropSlip` as the exact Play Store app name.
- Whether remove ads should be one-time purchase only for V1. Recommended: yes.
- Initial no-ads price. This can wait until after app testing.

## Official References

Review these again before implementation because Android, ads, and billing requirements change:

- Jetpack Compose documentation: https://developer.android.com/develop/ui/compose/documentation
- Compose setup: https://developer.android.com/develop/ui/compose/setup
- Android app quality: https://developer.android.com/quality
- Core app quality guidelines: https://developer.android.com/docs/quality-guidelines/core-app-quality
- Google Mobile Ads SDK Android setup: https://developers.google.com/admob/android/quick-start
- AdMob banner implementation guidance: https://support.google.com/admob/answer/6275345
- UMP SDK setup: https://developers.google.com/admob/android/privacy
- Google Play Billing integration: https://developer.android.com/google/play/billing/integrate
- Google Play Billing one-time products: https://developer.android.com/google/play/billing/one-time-products
- Google Play Billing test guidance: https://developer.android.com/google/play/billing/test
- Play Billing release notes: https://developer.android.com/google/play/billing/release-notes
- Google Play testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- Play testing tracks: https://support.google.com/googleplay/android-developer/answer/9845334
- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play target API policy: https://support.google.com/googleplay/android-developer/answer/11926878
