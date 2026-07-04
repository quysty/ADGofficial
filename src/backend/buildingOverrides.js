import { getSupabaseClient, getSupabaseConfigStatus } from "./supabaseClient.js";

export const BUILDING_LABEL_OVERRIDES_TABLE = "building_label_overrides";

export const BUILDING_LABEL_OVERRIDE_COLUMNS = [
  "building_number",
  "building_id",
  "display_mode",
  "type_key",
  "display_name",
  "short_name",
  "interactive",
  "label_enabled",
  "dorm_tag",
  "dorm_rent_text",
  "dorm_type",
  "dorm_location",
  "dorm_summary",
  "dorm_description",
  "dorm_best_for",
  "dorm_location_feel",
  "dorm_trade_off",
  "updated_at",
  "updated_by"
].join(",");

const LEGACY_BUILDING_LABEL_OVERRIDE_COLUMNS = [
  "building_number",
  "building_id",
  "display_mode",
  "type_key",
  "display_name",
  "short_name",
  "interactive",
  "label_enabled",
  "dorm_tag",
  "dorm_type",
  "dorm_location",
  "dorm_summary",
  "dorm_description",
  "updated_at",
  "updated_by"
].join(",");

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function nullableText(value) {
  const text = cleanText(value);
  return text || null;
}

function toBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeBuildingOverrideRow(row) {
  const buildingNumber = cleanText(row?.building_number);

  return {
    buildingNumber,
    buildingId: cleanText(row?.building_id),
    displayMode: cleanText(row?.display_mode),
    type: cleanText(row?.type_key),
    name: cleanText(row?.display_name),
    shortName: cleanText(row?.short_name),
    interactive: toBoolean(row?.interactive, false),
    labelEnabled: toBoolean(row?.label_enabled, true),
    dorm: {
      tag: cleanText(row?.dorm_tag),
      rentText: cleanText(row?.dorm_rent_text),
      type: cleanText(row?.dorm_type),
      location: cleanText(row?.dorm_location),
      summary: cleanText(row?.dorm_summary),
      description: cleanText(row?.dorm_description),
      bestFor: cleanText(row?.dorm_best_for),
      locationFeel: cleanText(row?.dorm_location_feel),
      tradeOff: cleanText(row?.dorm_trade_off)
    },
    updatedAt: row?.updated_at || "",
    updatedBy: row?.updated_by || ""
  };
}

export function createBuildingOverridePayload(values, userId = null) {
  return {
    building_number: cleanText(values.buildingNumber),
    building_id: nullableText(values.buildingId),
    display_mode: nullableText(values.displayMode) || "functional",
    type_key: nullableText(values.type) || "academic",
    display_name: nullableText(values.name),
    short_name: nullableText(values.shortName),
    interactive: !!values.interactive,
    label_enabled: values.labelEnabled !== false,
    dorm_tag: nullableText(values.dormTag),
    dorm_rent_text: nullableText(values.dormRentText),
    dorm_type: nullableText(values.dormType),
    dorm_location: nullableText(values.dormLocation),
    dorm_summary: nullableText(values.dormSummary),
    dorm_description: nullableText(values.dormDescription),
    dorm_best_for: nullableText(values.dormBestFor),
    dorm_location_feel: nullableText(values.dormLocationFeel),
    dorm_trade_off: nullableText(values.dormTradeOff),
    updated_by: userId || null
  };
}

async function selectBuildingLabelOverrideRows(client, columns) {
  return client
    .from(BUILDING_LABEL_OVERRIDES_TABLE)
    .select(columns)
    .order("building_number", { ascending: true });
}

export async function loadBuildingLabelOverrides() {
  const configStatus = getSupabaseConfigStatus();
  if (!configStatus.ready) {
    return {
      rows: [],
      overrides: {},
      skipped: true,
      error: null
    };
  }

  try {
    const client = getSupabaseClient();
    let { data, error } = await selectBuildingLabelOverrideRows(
      client,
      BUILDING_LABEL_OVERRIDE_COLUMNS
    );

    if (error && /dorm_(rent_text|best_for|location_feel|trade_off)/i.test(error.message || "")) {
      const legacyResult = await selectBuildingLabelOverrideRows(
        client,
        LEGACY_BUILDING_LABEL_OVERRIDE_COLUMNS
      );
      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) throw error;

    const rows = (data || [])
      .map(normalizeBuildingOverrideRow)
      .filter((row) => row.buildingNumber);

    return {
      rows,
      overrides: Object.fromEntries(rows.map((row) => [row.buildingNumber, row])),
      skipped: false,
      error: null
    };
  } catch (error) {
    console.warn("Building label overrides could not be loaded:", error);
    return {
      rows: [],
      overrides: {},
      skipped: false,
      error
    };
  }
}

function findDormForOverride(dorms, override) {
  if (!Array.isArray(dorms) || !override?.buildingId) return null;
  return dorms.find(
    (dorm) =>
      dorm?.buildingId === override.buildingId ||
      dorm?.mapFocus === override.buildingId ||
      dorm?.id === override.buildingId.replace(/^dorm_/, "")
  );
}

function applyDormTextOverride(dorms, override) {
  const dorm = findDormForOverride(dorms, override);
  if (!dorm) return;

  if (override.name) dorm.name = override.name;
  if (override.shortName) dorm.shortName = override.shortName;
  if (override.dorm.tag) dorm.tag = override.dorm.tag;
  if (override.dorm.rentText) dorm.rentText = override.dorm.rentText;
  if (override.dorm.type) dorm.type = override.dorm.type;
  if (override.dorm.location) dorm.location = override.dorm.location;
  if (override.dorm.summary) dorm.summary = override.dorm.summary;
  if (override.dorm.description) dorm.description = override.dorm.description;
  if (override.dorm.bestFor) dorm.bestFor = override.dorm.bestFor;
  if (override.dorm.locationFeel) dorm.locationFeel = override.dorm.locationFeel;
  if (override.dorm.tradeOff) dorm.tradeOff = override.dorm.tradeOff;
}

export function applyBuildingLabelOverrides(functionalBuildings, overrides, dorms = []) {
  const merged = { ...(functionalBuildings || {}) };
  const overrideMap = overrides?.overrides || overrides || {};

  Object.values(overrideMap).forEach((override) => {
    if (!override?.buildingNumber) return;

    if (override.labelEnabled === false) {
      delete merged[override.buildingNumber];
      return;
    }

    const existing = merged[override.buildingNumber] || {};
    const buildingId =
      override.buildingId || existing.buildingId || `building_${override.buildingNumber}`;
    const displayMode = override.displayMode || existing.displayMode || existing.mode || "functional";
    const type = override.type || existing.type || (displayMode === "dorm" ? "dorm" : "academic");

    merged[override.buildingNumber] = {
      ...existing,
      buildingId,
      displayMode,
      type,
      name: override.name || existing.name || `Building ${override.buildingNumber}`,
      shortName: override.shortName || existing.shortName || override.buildingNumber,
      interactive: override.interactive
    };

    applyDormTextOverride(dorms, {
      ...override,
      buildingId
    });
  });

  return merged;
}
