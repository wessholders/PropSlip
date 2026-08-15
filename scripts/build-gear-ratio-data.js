const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataRoot = path.join(root, "data", "gear-ratios");
const outputPath = path.join(root, "public", "gear-ratio-data.js");
const manufacturerOutputDir = path.join(root, "public", "gear-ratio-data");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function displayName(slug) {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseHorsepower(hpKey) {
  const match = String(hpKey).match(/[0-9]+(?:\.[0-9]+)?/);
  if (!match) return null;

  const value = Number.parseFloat(match[0]);
  if (!Number.isFinite(value)) return null;

  const qualifier = String(hpKey)
    .replace(match[0], "")
    .replace(/\bHP\b/i, "")
    .replace(/^[\s:./-]+|[\s:./-]+$/g, "")
    .replace(/\s+/g, " ");

  return {
    key: String(hpKey),
    value,
    label: `${Number.parseFloat(value.toFixed(3))} HP`,
    qualifier
  };
}

function modelDisplayName(model, qualifier) {
  if (!qualifier) return model;

  const lowerModel = model.toLowerCase();
  const lowerQualifier = qualifier.toLowerCase();
  if (lowerModel.includes(lowerQualifier)) return model;

  return `${qualifier} - ${model}`;
}

function collectData() {
  const bundle = {
    generatedFrom: "data/gear-ratios",
    manufacturers: [],
    data: {}
  };

  const manufacturerDirs = fs.readdirSync(dataRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "schemas")
    .map((entry) => entry.name)
    .sort((a, b) => displayName(a).localeCompare(displayName(b), "en", { sensitivity: "base" }));

  for (const manufacturer of manufacturerDirs) {
    const manufacturerDir = path.join(dataRoot, manufacturer);
    const yearFiles = fs.readdirSync(manufacturerDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^[0-9]{4}\.json$/.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));

    const years = [];
    const byYear = {};

    for (const file of yearFiles) {
      const year = path.basename(file, ".json");
      const filePath = path.join(manufacturerDir, file);
      const yearData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (!isPlainObject(yearData)) continue;

      const records = [];

      for (const [hpKey, modelMap] of Object.entries(yearData)) {
        const horsepower = parseHorsepower(hpKey);
        if (!horsepower || !isPlainObject(modelMap)) continue;

        for (const [model, record] of Object.entries(modelMap)) {
          if (!isPlainObject(record) || !Array.isArray(record.ratios)) continue;

          records.push({
            hpKey: horsepower.key,
            hpValue: horsepower.value,
            hpLabel: horsepower.label,
            hpQualifier: horsepower.qualifier,
            model,
            modelLabel: modelDisplayName(model, horsepower.qualifier),
            ratios: record.ratios.filter((ratio) => typeof ratio === "string")
          });
        }
      }

      if (records.length > 0) {
        years.push(Number.parseInt(year, 10));
        byYear[year] = records.sort((a, b) => {
          if (a.hpValue !== b.hpValue) return a.hpValue - b.hpValue;
          return a.modelLabel.localeCompare(b.modelLabel, "en", { numeric: true, sensitivity: "base" });
        });
      }
    }

    if (years.length > 0) {
      bundle.manufacturers.push({
        slug: manufacturer,
        name: displayName(manufacturer),
        years
      });
      bundle.data[manufacturer] = byYear;
    }
  }

  return bundle;
}

function main() {
  const bundle = collectData();
  fs.rmSync(manufacturerOutputDir, { recursive: true, force: true });
  fs.mkdirSync(manufacturerOutputDir, { recursive: true });

  for (const [manufacturer, byYear] of Object.entries(bundle.data)) {
    const manufacturerPath = path.join(manufacturerOutputDir, `${manufacturer}.js`);
    const contents = [
      "window.PropSlipGearRatioManufacturers = window.PropSlipGearRatioManufacturers || {};",
      `window.PropSlipGearRatioManufacturers[${JSON.stringify(manufacturer)}] = `,
      JSON.stringify(byYear, null, 2),
      ";\n"
    ].join("");

    fs.writeFileSync(manufacturerPath, contents, "utf8");
  }

  const manifest = {
    generatedFrom: bundle.generatedFrom,
    manufacturers: bundle.manufacturers,
    data: {}
  };

  const contents = [
    "window.PropSlipGearRatioData = ",
    JSON.stringify(manifest, null, 2),
    ";\n",
    "window.PropSlipGearRatioManufacturers = window.PropSlipGearRatioManufacturers || {};\n"
  ].join("");

  fs.writeFileSync(outputPath, contents, "utf8");
  console.log(`Wrote ${path.relative(root, outputPath)} and ${bundle.manufacturers.length} manufacturer data files.`);
}

main();
