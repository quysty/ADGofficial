import { getSupabaseClient, getSupabaseConfigStatus } from "./supabaseClient.js";

export const BUILDING_HEIGHT_OVERRIDES_TABLE = "building_height_overrides";
export const BUILDING_HEIGHT_HISTORY_TABLE = "building_height_override_history";

export const BUILDING_HEIGHT_OVERRIDE_COLUMNS = [
  "building_number",
  "draft_multiplier",
  "draft_copy_from_building_number",
  "published_multiplier",
  "published_copy_from_building_number",
  "status",
  "updated_at",
  "updated_by",
  "published_at",
  "published_by"
].join(",");

function cleanText(value) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim();
}

function nullableText(value) {
  const text = cleanText(value);
  return text || null;
}

function cleanMultiplier(value, fallback = null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Number(parsed.toFixed(4));
}

export function normalizeBuildingHeightOverrideRow(row) {
  const buildingNumber = cleanText(row?.building_number);
  const draftMultiplier = cleanMultiplier(row?.draft_multiplier, null);
  const publishedMultiplier = cleanMultiplier(row?.published_multiplier, null);

  return {
    buildingNumber,
    draftMultiplier,
    draftCopyFrom: cleanText(row?.draft_copy_from_building_number),
    publishedMultiplier,
    publishedCopyFrom: cleanText(row?.published_copy_from_building_number),
    status: cleanText(row?.status) || "draft",
    updatedAt: row?.updated_at || "",
    updatedBy: row?.updated_by || "",
    publishedAt: row?.published_at || "",
    publishedBy: row?.published_by || ""
  };
}

export function createBuildingHeightDraftPayload(values, userId = null) {
  return {
    building_number: cleanText(values.buildingNumber),
    draft_multiplier: cleanMultiplier(values.multiplier, 1),
    draft_copy_from_building_number: nullableText(values.copyFromBuildingNumber),
    status: "draft",
    updated_by: userId || null
  };
}

export function createBuildingHeightPublishPayload(values, userId = null) {
  const draft = createBuildingHeightDraftPayload(values, userId);

  return {
    ...draft,
    published_multiplier: draft.draft_multiplier,
    published_copy_from_building_number: draft.draft_copy_from_building_number,
    status: "published",
    published_by: userId || null,
    published_at: new Date().toISOString()
  };
}

export function createBuildingHeightSnapshot(row) {
  if (!row?.buildingNumber) return null;

  return {
    building_number: row.buildingNumber,
    draft_multiplier: row.draftMultiplier,
    draft_copy_from_building_number: row.draftCopyFrom || null,
    published_multiplier: row.publishedMultiplier,
    published_copy_from_building_number: row.publishedCopyFrom || null,
    status: row.status || "draft"
  };
}

export async function loadBuildingHeightOverrides() {
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
    const { data, error } = await client
      .from(BUILDING_HEIGHT_OVERRIDES_TABLE)
      .select(BUILDING_HEIGHT_OVERRIDE_COLUMNS)
      .order("building_number", { ascending: true });

    if (error) throw error;

    const rows = (data || [])
      .map(normalizeBuildingHeightOverrideRow)
      .filter((row) => row.buildingNumber);

    return {
      rows,
      overrides: Object.fromEntries(rows.map((row) => [row.buildingNumber, row])),
      skipped: false,
      error: null
    };
  } catch (error) {
    console.warn("Building height overrides could not be loaded:", error);
    return {
      rows: [],
      overrides: {},
      skipped: false,
      error
    };
  }
}
