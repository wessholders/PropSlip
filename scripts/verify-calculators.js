const calculators = require("../public/calculators.js");

function assertClose(actual, expected, label, tolerance = 0.000001) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

const slip = calculators.calculateSlip({
  pitch: 24,
  gearRatio: 1.75,
  rpm: 5600,
  speed: 68,
  speedUnit: "mph"
});

assertClose(slip.propRpm, 3200, "default prop RPM");
assertClose(slip.theoreticalMph, 72.72727272727273, "default theoretical speed");
assertClose(slip.actualMph, 68, "default actual speed");
assertClose(slip.slip, 6.5, "default slip");

const setupA = calculators.estimateSetup(24, 1.75, 5600, 10);
const setupB = calculators.estimateSetup(26, 1.75, 5600, 10);
const setupReverseB = calculators.estimateSetup(22, 1.75, 5600, 10);

assertClose(setupA.propRpm, 3200, "setup A prop RPM");
assertClose(setupA.theoreticalMph, 72.72727272727273, "setup A theoretical speed");
assertClose(setupA.estimatedMph, 65.45454545454545, "setup A estimated speed");
assertClose(setupB.estimatedMph - setupA.estimatedMph, 5.454545454545453, "setup B speed advantage");
assertClose(setupReverseB.estimatedMph - setupA.estimatedMph, -5.454545454545453, "setup A speed advantage");

assertClose(calculators.speedToMph(10, "knots"), 11.5077945, "knots to mph");
assertClose(calculators.speedToMph(100, "kph"), 62.1371192, "km/h to mph");
assertClose(calculators.speedFromMph(11.5077945, "knots"), 10, "mph to knots");
assertClose(calculators.speedFromMph(62.1371192, "kph"), 100, "mph to km/h");

assertEqual(calculators.calculateSlip({ pitch: 0, gearRatio: 1.75, rpm: 5600, speed: 68 }), null, "invalid slip inputs");
assertEqual(calculators.estimateSetup(24, 1.75, 5600, 101), null, "invalid setup slip");

console.log("Calculator formula checks passed.");
