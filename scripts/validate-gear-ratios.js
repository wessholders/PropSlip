const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataRoot = path.join(root, "data", "gear-ratios");
const schemaRoot = path.join(dataRoot, "schemas");
const yamahaSchemaPath = path.join(schemaRoot, "yamaha-year.schema.json");

const schemaByManufacturer = new Map([
  ["yamaha", yamahaSchemaPath]
]);

const genericYearSchema = {
  type: "object",
  propertyNames: {
    pattern: "[0-9]+(?:\\.[0-9]+)?"
  },
  additionalProperties: {
    type: "object",
    propertyNames: {
      minLength: 1
    },
    additionalProperties: {
      type: "object",
      required: ["ratios"],
      properties: {
        ratios: {
          type: "array",
          items: {
            type: "string",
            pattern: "^[0-9]+(?:\\.[0-9]+)?:1$"
          }
        },
        source: {
          type: "string",
          format: "uri"
        },
        diagram: {
          type: "string",
          format: "uri"
        }
      }
    }
  }
};

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Malformed JSON: ${error.message}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function typeName(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function formatPath(parts) {
  return parts.length === 0 ? "$" : `$${parts.map((part) => `[${JSON.stringify(part)}]`).join("")}`;
}

function isValidUri(value) {
  try {
    const url = new URL(value);
    return Boolean(url.protocol);
  } catch (error) {
    return false;
  }
}

function validateSchema(value, schema, location = [], errors = []) {
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${formatPath(location)} must equal ${JSON.stringify(schema.const)}`);
    return errors;
  }

  if (schema.type) {
    const validType = schema.type === "integer"
      ? Number.isInteger(value)
      : schema.type === "object"
        ? isPlainObject(value)
        : schema.type === "array"
          ? Array.isArray(value)
          : typeof value === schema.type;

    if (!validType) {
      errors.push(`${formatPath(location)} must be ${schema.type}; got ${typeName(value)}`);
      return errors;
    }
  }

  if (schema.type === "string" || typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${formatPath(location)} must have length >= ${schema.minLength}`);
    }

    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) {
      errors.push(`${formatPath(location)} must match /${schema.pattern}/`);
    }

    if (schema.format === "uri" && !isValidUri(value)) {
      errors.push(`${formatPath(location)} must be a valid URI`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, index) => validateSchema(item, schema.items, [...location, index], errors));
    }
    return errors;
  }

  if (!isPlainObject(value)) return errors;

  if (Array.isArray(schema.required)) {
    for (const key of schema.required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(`${formatPath(location)} must include required property ${JSON.stringify(key)}`);
      }
    }
  }

  if (schema.propertyNames) {
    for (const key of Object.keys(value)) {
      validateSchema(key, schema.propertyNames, [...location, key], errors);
    }
  }

  const knownProperties = schema.properties || {};
  const patternProperties = schema.patternProperties || {};
  const patterns = Object.entries(patternProperties).map(([pattern, subschema]) => [new RegExp(pattern), subschema]);

  for (const [key, childValue] of Object.entries(value)) {
    let matched = false;

    if (knownProperties[key]) {
      matched = true;
      validateSchema(childValue, knownProperties[key], [...location, key], errors);
    }

    for (const [pattern, subschema] of patterns) {
      if (pattern.test(key)) {
        matched = true;
        validateSchema(childValue, subschema, [...location, key], errors);
      }
    }

    if (!matched) {
      if (schema.additionalProperties === false) {
        errors.push(`${formatPath([...location, key])} is not allowed`);
      } else if (isPlainObject(schema.additionalProperties)) {
        validateSchema(childValue, schema.additionalProperties, [...location, key], errors);
      }
    }
  }

  return errors;
}

function collectJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "schemas") continue;
      files.push(...collectJsonFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files;
}

function validateYamahaFilename(filePath) {
  const errors = [];
  const filename = path.basename(filePath, ".json");

  if (!/^[0-9]{4}$/.test(filename)) {
    errors.push("Yamaha year files must be named with a four-digit year, such as 2005.json");
  }

  return errors;
}

function validateFile(filePath) {
  const relativePath = path.relative(root, filePath);
  const relativeParts = path.relative(dataRoot, filePath).split(path.sep);
  const manufacturer = relativeParts[0];
  const schemaPath = schemaByManufacturer.get(manufacturer);

  let data;
  let schema;

  try {
    data = readJson(filePath);
    schema = schemaPath ? readJson(schemaPath) : genericYearSchema;
  } catch (error) {
    return [`${relativePath}: ${error.message}`];
  }

  const filename = path.basename(filePath, ".json");
  const filenameErrors = /^[0-9]{4}$/.test(filename)
    ? []
    : [`${relativePath}: year files must be named with a four-digit year, such as 2005.json`];

  const errors = validateSchema(data, schema).map((error) => `${relativePath}: ${error}`);

  if (manufacturer === "yamaha") {
    errors.push(...validateYamahaFilename(filePath).map((error) => `${relativePath}: ${error}`));
  }

  return [...filenameErrors, ...errors];
}

function main() {
  const files = collectJsonFiles(dataRoot);

  if (files.length === 0) {
    console.log("No gear-ratio data files found.");
    return;
  }

  const errors = files.flatMap(validateFile);

  if (errors.length > 0) {
    console.error("Gear-ratio validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${files.length} gear-ratio data file${files.length === 1 ? "" : "s"}.`);
}

main();
