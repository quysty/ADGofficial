const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = process.cwd();
const dormDataPath = path.join(projectRoot, "src", "data", "dorms.js");

const requiredBaseFields = [
  "id",
  "buildingId",
  "mapFocus",
  "name",
  "shortName",
  "tag",
  "image",
  "type",
  "tags",
  "description",
  "bestFor",
  "locationFeel",
  "tradeOff",
  "summary",
  "pros",
  "cons",
  "isHomeCandidate",
  "isInformationVisible",
  "isMapLinked"
];

const booleanFields = [
  "isHomeCandidate",
  "isInformationVisible",
  "isMapLinked"
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`WARNING: ${message}`);
}

function loadDormData() {
  if (!fs.existsSync(dormDataPath)) {
    fail(`Missing dorm data file: ${dormDataPath}`);
    return [];
  }

  const source = fs.readFileSync(dormDataPath, "utf8");
  const sandbox = {
    window: {},
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {
    filename: dormDataPath
  });

  if (!Array.isArray(sandbox.window.DORM_DATA)) {
    fail("window.DORM_DATA must be an array.");
    return [];
  }

  return sandbox.window.DORM_DATA;
}

function checkDuplicateValues(dorms, fieldName) {
  const seen = new Map();

  for (const dorm of dorms) {
    const value = dorm[fieldName];

    if (!value) continue;

    if (seen.has(value)) {
      fail(`Duplicate ${fieldName}: ${value}`);
    } else {
      seen.set(value, dorm.id);
    }
  }
}

function checkImagePath(dorm) {
  if (!dorm.image) {
    fail(`${dorm.id}: image is missing.`);
    return;
  }

  if (/^https?:\/\//.test(dorm.image)) {
    warn(`${dorm.id}: image uses remote URL. Prefer local assets for deployment stability.`);
    return;
  }

  const imagePath = path.join(projectRoot, dorm.image);

  if (!fs.existsSync(imagePath)) {
    fail(`${dorm.id}: image file does not exist: ${dorm.image}`);
  }
}

function checkDorm(dorm, index) {
  if (!dorm || typeof dorm !== "object") {
    fail(`Dorm at index ${index} is not an object.`);
    return;
  }

  for (const field of requiredBaseFields) {
    if (!(field in dorm)) {
      fail(`${dorm.id || `index ${index}`}: missing required field "${field}".`);
    }
  }

  if (typeof dorm.id !== "string" || !dorm.id.trim()) {
    fail(`Dorm at index ${index}: id must be a non-empty string.`);
  }

  if (dorm.id && !/^[a-z0-9-]+$/.test(dorm.id)) {
    fail(`${dorm.id}: id should use lowercase letters, numbers, or hyphens only.`);
  }

  if (typeof dorm.name !== "string" || !dorm.name.trim()) {
    fail(`${dorm.id}: name must be a non-empty string.`);
  }

  if (typeof dorm.buildingId !== "string" || !dorm.buildingId.trim()) {
    fail(`${dorm.id}: buildingId must be a non-empty string.`);
  }

  if (typeof dorm.mapFocus !== "string" || !dorm.mapFocus.trim()) {
    fail(`${dorm.id}: mapFocus must be a non-empty string.`);
  }

  for (const field of booleanFields) {
    if (typeof dorm[field] !== "boolean") {
      fail(`${dorm.id}: ${field} must be true or false.`);
    }
  }

  if (!Array.isArray(dorm.tags)) {
    fail(`${dorm.id}: tags must be an array.`);
  }

  if (!Array.isArray(dorm.pros)) {
    fail(`${dorm.id}: pros must be an array.`);
  }

  if (!Array.isArray(dorm.cons)) {
    fail(`${dorm.id}: cons must be an array.`);
  }

  if (dorm.isHomeCandidate && !dorm.summary) {
    fail(`${dorm.id}: home candidate dorm must have summary.`);
  }

  if (dorm.isInformationVisible && !dorm.description) {
    warn(`${dorm.id}: information-visible dorm has no description.`);
  }

  if (dorm.isMapLinked && (!dorm.buildingId || !dorm.mapFocus)) {
    fail(`${dorm.id}: map-linked dorm must have buildingId and mapFocus.`);
  }

  checkImagePath(dorm);
}

function main() {
  const dorms = loadDormData();

  if (!dorms.length) {
    fail("DORM_DATA is empty.");
    return;
  }

  dorms.forEach(checkDorm);

  checkDuplicateValues(dorms, "id");
  checkDuplicateValues(dorms, "buildingId");
  checkDuplicateValues(dorms, "mapFocus");

  if (process.exitCode) {
    console.error("Dorm data validation failed.");
    return;
  }

  console.log(`Dorm data validation passed. Checked ${dorms.length} dorm records.`);
}

main();
