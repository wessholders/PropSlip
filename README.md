# Propeller Slip Calculator

A simple mobile-first propeller slip calculator. It runs as a static page with no build step or dependencies.

## Formula

```text
theoretical mph = (engine RPM / gear ratio * propeller pitch) / 1056
slip % = (theoretical mph - actual mph) / theoretical mph * 100
```

The calculator accepts speed in mph, knots, or km/h and converts the value to mph before calculating slip.

The slip relationship follows the propeller-theory definition of comparing ideal pitch advance against actual advance:
https://en.wikipedia.org/wiki/Propeller_theory

## Run

Open `index.html` in a browser.
