(function attachCalculatorLogic(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.PropSlipCalculators = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createCalculatorLogic() {
  const MPH_PER_KNOT = 1.15077945;
  const MPH_PER_KPH = 0.621371192;
  const INCHES_PER_MILE = 63360;
  const MINUTES_PER_HOUR = 60;
  const PROP_SPEED_DIVISOR = INCHES_PER_MILE / MINUTES_PER_HOUR;

  const UNIT_SYSTEMS = {
    imperial: { speedUnit: "mph", speedLabel: "mph" },
    metric: { speedUnit: "kph", speedLabel: "km/h" },
    nautical: { speedUnit: "knots", speedLabel: "kn" }
  };

  function speedToMph(speed, unit) {
    if (unit === "knots") return speed * MPH_PER_KNOT;
    if (unit === "kph") return speed * MPH_PER_KPH;
    return speed;
  }

  function speedFromMph(mph, unit) {
    if (unit === "knots") return mph / MPH_PER_KNOT;
    if (unit === "kph") return mph / MPH_PER_KPH;
    return mph;
  }

  function hasFiniteNumbers(values) {
    return values.every(Number.isFinite);
  }

  function calculatePropRpm(rpm, gearRatio) {
    if (!hasFiniteNumbers([rpm, gearRatio]) || rpm <= 0 || gearRatio <= 0) return null;
    return rpm / gearRatio;
  }

  function calculateTheoreticalMph(pitch, gearRatio, rpm) {
    if (!hasFiniteNumbers([pitch, gearRatio, rpm]) || pitch <= 0 || gearRatio <= 0 || rpm <= 0) return null;
    return (calculatePropRpm(rpm, gearRatio) * pitch) / PROP_SPEED_DIVISOR;
  }

  function calculateSlip({ pitch, gearRatio, rpm, speed, speedUnit = "mph" }) {
    if (!hasFiniteNumbers([pitch, gearRatio, rpm, speed]) || pitch <= 0 || gearRatio <= 0 || rpm <= 0 || speed < 0) {
      return null;
    }

    const propRpm = calculatePropRpm(rpm, gearRatio);
    const theoreticalMph = calculateTheoreticalMph(pitch, gearRatio, rpm);
    const actualMph = speedToMph(speed, speedUnit);
    const slip = ((theoreticalMph - actualMph) / theoreticalMph) * 100;

    return { actualMph, propRpm, theoreticalMph, slip };
  }

  function estimateSetup(pitch, gearRatio, rpm, slip) {
    if (!hasFiniteNumbers([pitch, gearRatio, rpm, slip]) || pitch <= 0 || gearRatio <= 0 || rpm <= 0 || slip < 0 || slip > 100) {
      return null;
    }

    const propRpm = calculatePropRpm(rpm, gearRatio);
    const theoreticalMph = calculateTheoreticalMph(pitch, gearRatio, rpm);
    const estimatedMph = theoreticalMph * (1 - (slip / 100));

    return { propRpm, theoreticalMph, estimatedMph };
  }

  return {
    MPH_PER_KNOT,
    MPH_PER_KPH,
    PROP_SPEED_DIVISOR,
    UNIT_SYSTEMS,
    speedToMph,
    speedFromMph,
    calculatePropRpm,
    calculateTheoreticalMph,
    calculateSlip,
    estimateSetup
  };
});
