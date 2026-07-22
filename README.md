# PropSlip Boating Calculators

PropSlip is a simple mobile-first boating calculator site. It runs as a static page with no build step or dependencies.

The main page currently includes:

- Propeller slip calculator
- Theoretical Setup calculator for estimating speed from pitch, gear ratio, RPM, and target slip

The Theoretical Setup calculator includes an optional comparison mode. It is off by default and can be turned on inside the Theoretical Setup tab to compare Setup A with Setup B.

`public/index.html` is the deployable page.

## MVP Pages

The deployable site includes menu sheets for:

- How to Use
- About
- Privacy
- Accessibility
- Terms & Disclaimer
- Contact
- Mobile Apps
- Settings

The public support address is propslipsupport@gmail.com.

## Slip Formula

```text
theoretical mph = (engine RPM / gear ratio * propeller pitch) / 1056
slip % = (theoretical mph - actual mph) / theoretical mph * 100
```

The calculator accepts speed in mph, knots, or km/h and converts the value to mph before calculating slip.

The slip relationship follows the propeller-theory definition of comparing ideal pitch advance against actual advance:
https://en.wikipedia.org/wiki/Propeller_theory

## Run

Open `public/index.html` in a browser.

## Verify

Run the local render check with Node.js 22 or newer and Chrome/Chromium:

```text
node scripts/verify-render.mjs
```

The script auto-detects common Chrome paths on Windows, macOS, and Linux. If Chrome is installed somewhere else, set `CHROME_PATH` to the executable path before running it.

The script uses a temporary Chrome profile to avoid path/profile lock issues, captures `propslip-home.png` and `propslip-whatif-comparison.png`, checks the Propeller Slip and Theoretical Setup tabs, and verifies the Theoretical Setup comparison toggle. The same smoke test runs in GitHub Actions on pushes to `main` and pull requests.

## Deploy

This repo is ready for a static host with a custom domain.

- Netlify: import the repository, leave the build command empty, and use `public` as the publish directory. `netlify.toml` already defines this.
- Vercel: import the repository as a static project. `vercel.json` points the output directory at `public` and enables clean URLs and basic security headers.
- Render: create a Static Site from the repository, or use the included `render.yaml`. The static publish path is `public` and the build command is `true`.
- GitHub Pages still works, but a custom-domain static host will feel more official while preserving the same static files.
