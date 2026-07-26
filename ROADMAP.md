# PropSlip Monetization and App Roadmap

These notes capture the long-term direction so near-term website work does not block future revenue, Android, or iOS plans.

## North Star

PropSlip should stay useful as a free boating calculator product while creating room for revenue:

- Website: free calculators with tasteful ad banners or another low-friction revenue model.
- Android app: free app with ads, plus a paid no-ads option.
- iOS app: same model if/when iOS follows Android.
- Core trust: calculator results, safety disclaimers, accessibility, and user experience stay ahead of monetization.

## Product Guardrails

- Keep the first screen calculator-first. Ads should never make the product feel like an ad page with a calculator attached.
- Reserve ad space deliberately instead of letting ad scripts shift layouts after load.
- Keep ads away from primary input fields, tab controls, clear buttons, and other high-touch areas to reduce accidental clicks.
- Never ask users to click ads or imply that clicking ads supports the site.
- Preserve a strong no-login path. If accounts are added later, they should solve a real need such as cross-device settings or purchase entitlement, not become a prerequisite for basic calculators.
- Keep formulas centralized and testable before app work starts so web, Android, and iOS produce the same numbers.

## Revenue Options

1. Web display ads
   - Likely path: Google AdSense or a direct sponsor banner.
   - Add one reserved banner region first, probably below the calculator or between larger desktop sections.
   - Avoid sticky overlays, floating ad boxes, pop-ups, and ads mixed into calculator controls.
   - Update privacy/cookie disclosures before enabling live ads.
   - Update Content Security Policy intentionally. The current CSP is strict and blocks external ad scripts by design.

2. App display ads
   - Likely path: Google AdMob for Android, with banner ads as the first format.
   - Use test ads during development and internal testing.
   - Avoid app-open/interstitial ads until usage patterns justify them.
   - Keep any app banner outside dense calculator input areas.

3. No-ads purchase
   - Android: use Google Play Billing or an approved alternative if current Play policy allows it for the target market at launch.
   - iOS: use StoreKit In-App Purchase.
   - Start with a one-time non-consumable "Remove Ads" purchase unless there is a strong reason for a subscription.
   - Build a restore-purchase path from day one.
   - Store entitlement locally for fast startup, but verify and restore through the platform store.

4. Other revenue paths
   - Direct sponsor slots from marine brands, prop shops, repair shops, or boating services.
   - Affiliate links for props, gauges, setup tools, or safety gear only if clearly disclosed.
   - Paid pro tools later, but only after the free calculator experience is solid.

## Implementation Phases

### Phase 1: Website MVP Stability

- Keep Propeller Slip and Theoretical Setup as the main calculators.
- Improve desktop layout without weakening mobile.
- Maintain Privacy, Accessibility, Terms, Contact, and Mobile Apps sheets.
- Keep smoke tests passing for the default tab, Theoretical Setup, and comparison mode.
- Add unit-style formula tests before major monetization or app work.

### Phase 2: Monetization-Ready Website

- Add non-live placeholder ad slots so layout can be tested before real ads.
- Decide first web revenue source: AdSense, direct sponsor, affiliate, or no ads until traffic exists.
- Update privacy language for ads, cookies, identifiers, and third-party processing.
- Add cookie/consent handling if required for target regions and ad product configuration.
- Update CSP only after the exact ad provider is chosen.
- Add tests/screenshots for ad-slot layout on mobile and desktop.

### Phase 3: Shared Calculator Logic

- Extract prop slip and theoretical setup formulas from `public/app.js` into a small shared module.
- Add deterministic test vectors for mph, knots, and km/h.
- Document rounding rules so app results match the website.
- Keep UI state separate from math functions.
- Use this module as the source contract for Android and iOS implementations.

### Phase 4: Android App Foundation

- Choose implementation path:
  - Kotlin + Jetpack Compose for best native Android fit.
  - Flutter if Android and iOS are expected to move together soon.
- Build the free calculator app first with no live ads.
- Add AdMob test ads only after the calculator UX is stable.
- Add a no-ads entitlement model before live ads so ad visibility has one clear source of truth.
- Add Play Store Data Safety, privacy policy link, support contact, and app content declarations.

### Phase 5: Paid No-Ads Release

- Create store products:
  - Android product idea: `remove_ads`.
  - iOS product idea: `remove_ads`.
- Implement purchase, restore, local entitlement cache, and error states.
- Make "remove ads" remove only advertising, not core calculator functionality.
- Test upgrade, reinstall, restore, offline startup, and failed purchase paths.

### Phase 6: Live Ads and Optimization

- Enable live web/app ads only after policy, privacy, and consent requirements are reviewed.
- Start with low-density banners.
- Watch layout stability, accidental-click risk, performance, and user feedback.
- Track revenue separately by web, Android ads, iOS ads, and no-ads purchases.
- Revisit direct sponsors once the product has traffic or app installs.

## Policy Checkpoints

Verify current policies before implementation and again before launch. At minimum, review:

- Google AdSense eligibility and program policies.
- Google Publisher privacy requirements for ads, cookies, identifiers, and personalized advertising.
- Google AdMob policies, invalid traffic guidance, and banner placement guidance.
- Google Play payments policy and current billing options for the target countries.
- Apple App Review Guidelines and StoreKit/In-App Purchase setup if iOS is in scope.

Current reference links:

- https://support.google.com/adsense/answer/9724
- https://support.google.com/adsense/answer/48182
- https://support.google.com/adsense/answer/10502938
- https://support.google.com/admob/answer/6128543
- https://support.google.com/admob/answer/3342099
- https://support.google.com/admob/answer/6275345
- https://support.google.com/googleplay/android-developer/answer/9858738
- https://developer.android.com/google/play/billing
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/

## Near-Term Next Steps

1. Improve desktop layout for the current two-calculator MVP.
2. Add math test coverage and lock down expected results.
3. Add reserved, non-live ad-slot layout experiments behind a clear class or feature flag.
4. Decide whether the first app path is Android-native or cross-platform.
5. Before any live ads, update privacy/terms copy and CSP for the chosen provider.
