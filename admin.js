import { getSupabaseClient, getSupabaseConfigStatus } from "./src/backend/supabaseClient.js";
import {
  BUILDING_LABEL_OVERRIDE_COLUMNS,
  BUILDING_LABEL_OVERRIDES_TABLE,
  createBuildingOverridePayload,
  normalizeBuildingOverrideRow
} from "./src/backend/buildingOverrides.js";

const BACKEND_TEST_KEY = "backend_test_message";
const PENDING_EMAIL_KEY = "anu_explore_admin_pending_email";
const BUILDING_LABEL_HISTORY_TABLE = "building_label_override_history";

const els = {
  status: document.querySelector("#adminStatus"),
  refresh: document.querySelector("#adminRefresh"),
  configPanel: document.querySelector("#adminConfigPanel"),
  configText: document.querySelector("#adminConfigText"),
  loginPanel: document.querySelector("#adminLoginPanel"),
  passwordForm: document.querySelector("#adminPasswordForm"),
  loginForm: document.querySelector("#adminLoginForm"),
  email: document.querySelector("#adminEmail"),
  password: document.querySelector("#adminPassword"),
  otpForm: document.querySelector("#adminOtpForm"),
  otpCode: document.querySelector("#adminOtpCode"),
  sessionPanel: document.querySelector("#adminSessionPanel"),
  userEmail: document.querySelector("#adminUserEmail"),
  roleText: document.querySelector("#adminRoleText"),
  bootstrapSql: document.querySelector("#adminBootstrapSql"),
  signOut: document.querySelector("#adminSignOut"),
  buildingPanel: document.querySelector("#adminBuildingPanel"),
  buildingReload: document.querySelector("#adminBuildingReload"),
  buildingStatus: document.querySelector("#adminBuildingStatus"),
  buildingGuard: document.querySelector("#adminBuildingGuard"),
  buildingForm: document.querySelector("#adminBuildingForm"),
  buildingSelect: document.querySelector("#adminBuildingSelect"),
  buildingNumber: document.querySelector("#adminBuildingNumber"),
  buildingId: document.querySelector("#adminBuildingId"),
  displayMode: document.querySelector("#adminDisplayMode"),
  typeKey: document.querySelector("#adminTypeKey"),
  displayName: document.querySelector("#adminDisplayName"),
  shortName: document.querySelector("#adminShortName"),
  labelEnabled: document.querySelector("#adminLabelEnabled"),
  interactive: document.querySelector("#adminInteractive"),
  dormTag: document.querySelector("#adminDormTag"),
  dormRent: document.querySelector("#adminDormRent"),
  dormType: document.querySelector("#adminDormType"),
  dormLocation: document.querySelector("#adminDormLocation"),
  dormSummary: document.querySelector("#adminDormSummary"),
  dormDescription: document.querySelector("#adminDormDescription"),
  dormBestFor: document.querySelector("#adminDormBestFor"),
  dormLocationFeel: document.querySelector("#adminDormLocationFeel"),
  dormTradeOff: document.querySelector("#adminDormTradeOff"),
  rollbackBuilding: document.querySelector("#adminRollbackBuilding"),
  publishPublic: document.querySelector("#adminPublishPublic"),
  settingsPanel: document.querySelector("#adminSettingsPanel"),
  settingsForm: document.querySelector("#adminSettingsForm"),
  settingValue: document.querySelector("#adminSettingValue"),
  settingMeta: document.querySelector("#adminSettingMeta")
};

const state = {
  client: null,
  session: null,
  adminProfile: null,
  setting: null,
  buildingRows: [],
  selectedBuildingNumber: ""
};

const DISPLAY_MODE_TYPE_MAP = {
  dorm: "dorm",
  functional: "academic",
  social: "social",
  store: "store",
  reference: "reference"
};

const DISPLAY_MODE_LABELS = {
  dorm: "宿舍",
  functional: "功能建筑",
  social: "社会建筑",
  store: "商店",
  reference: "商场"
};

const TYPE_LABELS = {
  dorm: "绿色宿舍",
  academic: "蓝色功能",
  social: "黄色社会",
  store: "橙色商店",
  reference: "紫色商场",
  retail: "浅橙零售"
};

const EDITABLE_FIELD_LABELS = {
  name: "宿舍名称",
  shortName: "地图水滴标签",
  dormTag: "详情标签",
  dormRentText: "Rent",
  dormType: "Type",
  dormLocation: "Location",
  dormSummary: "介绍",
  dormBestFor: "Best for",
  dormLocationFeel: "Location feel",
  dormTradeOff: "Main trade-off"
};

const DORM_DETAIL_DEFAULTS = [
  {
    id: "lena",
    buildingId: "dorm_lena",
    name: "Lena Karmel Lodge",
    shortName: "Lena",
    tag: "QUIET / PRIVATE",
    type: "Apartment-style residence",
    location: "City-side / campus edge",
    summary: "A strong option when the user prioritises privacy, personal space, and structured independent living.",
    description: "A residence option currently represented as a quiet and private choice in the prototype recommendation logic.",
    bestFor: "A strong option when the user prioritises privacy, personal space, and structured independent living.",
    locationFeel: "Modern and practical, with a stronger sense of private routine than traditional hall life.",
    tradeOff: "Can feel more independent and less socially automatic than some more communal residences.",
    pricePerWeek: null
  },
  {
    id: "warrumbul",
    buildingId: "dorm_warrumbul",
    name: "Warrumbul Lodge",
    shortName: "Warrumbul",
    tag: "CITY / ACCESS",
    type: "Self-catered residence",
    location: "Campus / city access",
    summary: "Useful when the user wants practical location advantages and everyday movement convenience.",
    description: "A residence option currently represented as a practical access-focused choice in the prototype recommendation logic.",
    bestFor: "Useful when the user wants practical location advantages and everyday movement convenience.",
    locationFeel: "Convenient, flexible, and easier for students who care about getting around efficiently.",
    tradeOff: "Its strength is practicality rather than a highly distinctive hall-style atmosphere.",
    pricePerWeek: null
  },
  {
    id: "wright",
    buildingId: "dorm_wright",
    name: "Wright Hall",
    shortName: "Wright",
    tag: "RESIDENTIAL / EXPERIENCE",
    type: "Residential hall",
    location: "Residential campus setting",
    summary: "Relevant when the user is comparing social atmosphere, view quality, shared spaces, and the meaning of residential life.",
    description: "A residence option currently represented as a more residential and experience-oriented choice in the prototype recommendation logic.",
    bestFor: "Relevant when the user is comparing social atmosphere, view quality, shared spaces, and the meaning of residential life.",
    locationFeel: "More overtly residential, more social, and easier to read as a classic hall environment.",
    tradeOff: "It may suit users less well if they strongly prefer private, apartment-like living.",
    pricePerWeek: null
  },
  {
    id: "kinloch",
    buildingId: "dorm_kinloch",
    name: "Kinloch Lodge",
    shortName: "Kinloch",
    tag: "CITY / SELF-CONTAINED",
    type: "Apartment-style residence",
    location: "Childers Street / city edge",
    summary: "A practical option when the user wants self-contained living close to both campus routines and the city edge.",
    description: "A lodge-style residence currently represented as a city-edge, self-contained option in the prototype recommendation logic.",
    bestFor: "A practical option when the user wants self-contained living close to both campus routines and the city edge.",
    locationFeel: "Urban, convenient, and more independent-feeling than a traditional residential hall.",
    tradeOff: "May feel more functional and apartment-like, with less automatic hall-style community energy.",
    pricePerWeek: null
  },
  {
    id: "davey",
    buildingId: "dorm_davey",
    name: "Davey Lodge",
    shortName: "Davey",
    tag: "APARTMENT / SOCIAL",
    type: "Self-catered apartment residence",
    location: "Childers Street / city access",
    summary: "Useful when the user wants apartment-style independence while still having shared spaces and campus-city convenience.",
    description: "A self-catered lodge option currently represented as an apartment-style residence with practical access and shared common spaces.",
    bestFor: "Useful when the user wants apartment-style independence while still having shared spaces and campus-city convenience.",
    locationFeel: "Central, practical, and designed around self-catered apartments with common spaces for social interaction.",
    tradeOff: "Its appeal is convenience and self-contained living rather than a classic catered college atmosphere.",
    pricePerWeek: null
  },
  {
    id: "toad",
    buildingId: "dorm_toad",
    name: "Toad Hall",
    shortName: "Toad",
    tag: "PLACEHOLDER / RESIDENCE",
    type: "Residential hall",
    location: "ANU campus",
    summary: "Placeholder residence profile for Toad Hall.",
    description: "Toad Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
    bestFor: "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
    locationFeel: "Location and living feel are pending detailed content review.",
    tradeOff: "This profile is currently a functional placeholder and should be refined later.",
    pricePerWeek: null
  },
  {
    id: "fenner",
    buildingId: "dorm_fenner",
    name: "Fenner Hall",
    shortName: "Fenner",
    tag: "PLACEHOLDER / RESIDENCE",
    type: "Residential hall",
    location: "ANU campus",
    summary: "Placeholder residence profile for Fenner Hall.",
    description: "Fenner Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
    bestFor: "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
    locationFeel: "Location and living feel are pending detailed content review.",
    tradeOff: "This profile is currently a functional placeholder and should be refined later.",
    pricePerWeek: null
  },
  {
    id: "bruce",
    buildingId: "dorm_bruce",
    name: "Bruce Hall",
    shortName: "Bruce",
    tag: "PLACEHOLDER / RESIDENCE",
    type: "Residential hall",
    location: "ANU campus",
    summary: "Placeholder residence profile for Bruce Hall.",
    description: "Bruce Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
    bestFor: "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
    locationFeel: "Location and living feel are pending detailed content review.",
    tradeOff: "This profile is currently a functional placeholder and should be refined later.",
    pricePerWeek: null
  },
  {
    id: "ursula-laurus",
    buildingId: "dorm_ursula_laurus",
    name: "Ursula Hall Laurus Wing",
    shortName: "Ursula",
    tag: "PLACEHOLDER / RESIDENCE",
    type: "Residential hall",
    location: "ANU campus",
    summary: "Placeholder residence profile for Ursula Hall Laurus Wing.",
    description: "Ursula Hall Laurus Wing is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
    bestFor: "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
    locationFeel: "Location and living feel are pending detailed content review.",
    tradeOff: "This profile is currently a functional placeholder and should be refined later.",
    pricePerWeek: null
  },
  {
    id: "burton-garran",
    buildingId: "dorm_burton_garran",
    name: "Burton & Garran Hall",
    shortName: "B&G",
    tag: "PLACEHOLDER / RESIDENCE",
    type: "Residential hall",
    location: "ANU campus",
    summary: "Placeholder residence profile for Burton & Garran Hall.",
    description: "Burton & Garran Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
    bestFor: "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
    locationFeel: "Location and living feel are pending detailed content review.",
    tradeOff: "This profile is currently a functional placeholder and should be refined later.",
    pricePerWeek: null
  }
];

function setStatus(message, tone = "neutral") {
  els.status.textContent = message;
  els.status.dataset.tone = tone;
}

function setHidden(element, hidden) {
  if (element) element.hidden = hidden;
}

function getPendingEmail() {
  return window.sessionStorage.getItem(PENDING_EMAIL_KEY) || "";
}

function setPendingEmail(email) {
  if (email) {
    window.sessionStorage.setItem(PENDING_EMAIL_KEY, email);
  } else {
    window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
  }
}

function getJsonText(value) {
  if (value && typeof value === "object" && typeof value.text === "string") {
    return value.text;
  }
  if (typeof value === "string") return value;
  return JSON.stringify(value || {}, null, 2);
}

function renderConfig() {
  const configStatus = getSupabaseConfigStatus();
  setHidden(els.configPanel, configStatus.ready);

  if (configStatus.ready) {
    els.configText.textContent = "";
    return true;
  }

  const missing = [];
  if (!configStatus.hasUrl) missing.push("Project URL");
  if (!configStatus.hasPublishableKey) missing.push("publishable key");

  els.configText.textContent = `Missing ${missing.join(" and ")} in src/backend/supabase-config.js.`;
  setStatus("Supabase config is incomplete.", "warning");
  return false;
}

function renderLoggedOut() {
  const pendingEmail = getPendingEmail();
  setHidden(els.loginPanel, false);
  setHidden(els.otpForm, !pendingEmail);
  setHidden(els.sessionPanel, true);
  setHidden(els.buildingPanel, true);
  setHidden(els.settingsPanel, true);
  if (pendingEmail) {
    els.email.value = pendingEmail;
    setStatus("Email code sent. Enter the newest code from your inbox.", "neutral");
    return;
  }
  setStatus("Signed out. Use password login, or send an email code as backup.", "neutral");
}

function renderBootstrapSql(user) {
  const email = user?.email || "YOUR_ADMIN_EMAIL@example.com";
  const id = user?.id || "YOUR_AUTH_USER_ID";

  els.bootstrapSql.textContent = `insert into public.admin_users (user_id, email)
values ('${id}', '${email}')
on conflict (user_id) do update
set email = excluded.email,
    role = 'admin';`;
}

function renderSession() {
  const user = state.session?.user;
  setHidden(els.loginPanel, true);
  setHidden(els.sessionPanel, false);
  els.userEmail.textContent = user?.email || "Signed in";

  if (!state.adminProfile) {
    els.roleText.textContent =
      "Signed in, but this user is not in admin_users yet. Run the SQL below in Supabase SQL Editor once.";
    renderBootstrapSql(user);
    setHidden(els.bootstrapSql, false);
    setHidden(els.buildingPanel, true);
    setHidden(els.settingsPanel, true);
    setStatus("Signed in without admin permission.", "warning");
    return;
  }

  els.roleText.textContent = `Admin permission active: ${state.adminProfile.role || "admin"}.`;
  setHidden(els.bootstrapSql, true);
  setHidden(els.buildingPanel, false);
  setHidden(els.settingsPanel, true);
  setStatus("Admin permission active.", "success");
}

function renderSetting() {
  if (!state.setting) {
    els.settingValue.value = "";
    els.settingMeta.textContent = "No backend_test_message row found.";
    return;
  }

  els.settingValue.value = getJsonText(state.setting.value);
  els.settingMeta.textContent = `Public: ${state.setting.is_public ? "yes" : "no"} · Updated: ${
    state.setting.updated_at || "unknown"
  }`;
}

function setBuildingStatus(message, tone = "neutral") {
  els.buildingStatus.textContent = message;
  els.buildingStatus.dataset.tone = tone;
}

function setBuildingGuard(message = "") {
  els.buildingGuard.textContent = message;
}

function getSelectedBuildingRow() {
  return state.buildingRows.find(
    (row) => row.buildingNumber === state.selectedBuildingNumber
  ) || null;
}

function setFieldValue(element, value) {
  if (!element) return;
  element.value = value || "";
}

function getDefaultDormForRow(row) {
  if (!row) return null;
  const buildingId = row.buildingId || "";
  const dormId = buildingId.replace(/^dorm_/, "");

  return (
    DORM_DETAIL_DEFAULTS.find(
      (dorm) =>
        dorm?.buildingId === buildingId ||
        dorm?.mapFocus === buildingId ||
        dorm?.id === dormId
    ) || null
  );
}

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function formatDefaultDormRent(dorm) {
  if (!dorm) return "Not listed";
  if (dorm.rentText) return dorm.rentText;
  if (dorm.pricePerWeek == null) return "Not listed";
  return `$${Number(dorm.pricePerWeek).toLocaleString()} / week`;
}

function getTypeForDisplayMode(displayMode) {
  return DISPLAY_MODE_TYPE_MAP[displayMode] || "academic";
}

function isDormMode() {
  return els.displayMode?.value === "dorm";
}

function allowsInteractive(displayMode) {
  return displayMode === "dorm" || displayMode === "functional";
}

function setDormFieldsDisabled(disabled) {
  [
    els.dormTag,
    els.dormRent,
    els.dormType,
    els.dormLocation,
    els.dormSummary,
    els.dormBestFor,
    els.dormLocationFeel,
    els.dormTradeOff
  ].forEach(
    (field) => {
      if (!field) return;
      field.disabled = disabled;
      field.closest(".admin-field")?.classList.toggle("is-disabled", disabled);
    }
  );
}

function syncBuildingGuardRules() {
  const displayMode = els.displayMode?.value || "dorm";
  const typeKey = getTypeForDisplayMode(displayMode);
  const dormMode = displayMode === "dorm";
  const interactiveAllowed = allowsInteractive(displayMode) && els.labelEnabled?.checked;

  if (els.typeKey) els.typeKey.value = typeKey;
  setDormFieldsDisabled(!dormMode);

  if (els.interactive && !interactiveAllowed) {
    els.interactive.checked = false;
  }
  if (els.interactive) {
    els.interactive.disabled = !interactiveAllowed;
    els.interactive.closest(".admin-check")?.classList.toggle("is-disabled", !interactiveAllowed);
  }

  const guardParts = [
    "当前页面只允许维护宿舍名称、标签和详情文字。",
    "楼号、内部 ID、建筑类型、颜色和点击权限已锁定。"
  ];

  guardParts.push(`底层类型固定为 ${TYPE_LABELS[typeKey] || typeKey}。`);

  setBuildingGuard(guardParts.join(" "));
}

function fillBuildingForm(row) {
  const fallback = row || {};
  const defaultDorm = getDefaultDormForRow(fallback);
  setFieldValue(els.buildingNumber, fallback.buildingNumber);
  setFieldValue(els.buildingId, fallback.buildingId);
  setFieldValue(els.displayMode, fallback.displayMode || "dorm");
  setFieldValue(els.typeKey, getTypeForDisplayMode(fallback.displayMode || "dorm"));
  setFieldValue(els.displayName, firstText(fallback.name, defaultDorm?.name));
  setFieldValue(els.shortName, firstText(fallback.shortName, defaultDorm?.shortName));
  if (els.labelEnabled) els.labelEnabled.checked = fallback.labelEnabled !== false;
  if (els.interactive) els.interactive.checked = !!fallback.interactive;
  setFieldValue(els.dormTag, firstText(fallback.dorm?.tag, defaultDorm?.tag));
  setFieldValue(els.dormRent, firstText(fallback.dorm?.rentText, formatDefaultDormRent(defaultDorm)));
  setFieldValue(els.dormType, firstText(fallback.dorm?.type, defaultDorm?.type));
  setFieldValue(els.dormLocation, firstText(fallback.dorm?.location, defaultDorm?.location));
  setFieldValue(
    els.dormSummary,
    firstText(fallback.dorm?.summary, defaultDorm?.summary, defaultDorm?.description)
  );
  setFieldValue(els.dormBestFor, firstText(fallback.dorm?.bestFor, defaultDorm?.bestFor));
  setFieldValue(
    els.dormLocationFeel,
    firstText(fallback.dorm?.locationFeel, defaultDorm?.locationFeel)
  );
  setFieldValue(els.dormTradeOff, firstText(fallback.dorm?.tradeOff, defaultDorm?.tradeOff));
  syncBuildingGuardRules();
}

function renderBuildingOptions() {
  els.buildingSelect.innerHTML = "";

  if (!state.buildingRows.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无宿舍数据";
    els.buildingSelect.appendChild(option);
    fillBuildingForm(null);
    setBuildingStatus("没有可编辑的宿舍数据。请先运行宿舍详情 SQL 补丁。", "warning");
    return;
  }

  if (
    !state.selectedBuildingNumber ||
    !state.buildingRows.some((row) => row.buildingNumber === state.selectedBuildingNumber)
  ) {
    state.selectedBuildingNumber = state.buildingRows[0].buildingNumber;
  }

  state.buildingRows.forEach((row) => {
    const option = document.createElement("option");
    option.value = row.buildingNumber;
    option.textContent = `${row.name || row.shortName || row.buildingId} · ${row.buildingNumber}`;
    els.buildingSelect.appendChild(option);
  });

  els.buildingSelect.value = state.selectedBuildingNumber;
  fillBuildingForm(getSelectedBuildingRow());
  setBuildingStatus(`已载入 ${state.buildingRows.length} 个宿舍。`, "success");
}

function getBuildingFormValues() {
  const selectedRow = getSelectedBuildingRow();
  const labelEnabled = selectedRow?.labelEnabled !== false;
  const interactive = !!selectedRow?.interactive;

  return {
    buildingNumber: selectedRow?.buildingNumber || els.buildingNumber.value,
    buildingId: selectedRow?.buildingId || els.buildingId.value,
    displayMode: "dorm",
    type: "dorm",
    name: els.displayName.value,
    shortName: els.shortName.value,
    labelEnabled,
    interactive,
    dormTag: els.dormTag.value,
    dormRentText: els.dormRent.value,
    dormType: els.dormType.value,
    dormLocation: els.dormLocation.value,
    dormSummary: els.dormSummary.value,
    dormDescription: els.dormSummary.value,
    dormBestFor: els.dormBestFor.value,
    dormLocationFeel: els.dormLocationFeel.value,
    dormTradeOff: els.dormTradeOff.value
  };
}

function rowToComparableValues(row) {
  if (!row) return {};
  return {
    name: row.name || "",
    shortName: row.shortName || "",
    dormTag: row.dorm?.tag || "",
    dormRentText: row.dorm?.rentText || "",
    dormType: row.dorm?.type || "",
    dormLocation: row.dorm?.location || "",
    dormSummary: row.dorm?.summary || "",
    dormBestFor: row.dorm?.bestFor || "",
    dormLocationFeel: row.dorm?.locationFeel || "",
    dormTradeOff: row.dorm?.tradeOff || ""
  };
}

function normalizeComparableValue(value) {
  if (typeof value === "boolean") return value ? "on" : "off";
  return String(value || "").trim();
}

function getBuildingChangeSummary(previousRow, nextValues) {
  const previous = rowToComparableValues(previousRow);
  return Object.entries(EDITABLE_FIELD_LABELS)
    .map(([key, label]) => {
      const beforeValue = normalizeComparableValue(previous[key]);
      const afterValue = normalizeComparableValue(nextValues[key]);
      if (beforeValue === afterValue) return null;
      return `${label}: ${beforeValue || "空"} -> ${afterValue || "空"}`;
    })
    .filter(Boolean);
}

function confirmBuildingSave(previousRow, nextValues) {
  const changes = getBuildingChangeSummary(previousRow, nextValues);
  if (!changes.length) {
    setBuildingStatus("No changes to save.", "neutral");
    return false;
  }

  return window.confirm(
    `确认保存 ${nextValues.name || nextValues.buildingNumber} 的这些内容改动？\n\n${changes.join("\n")}`
  );
}

async function loadAdminProfile() {
  const user = state.session?.user;
  state.adminProfile = null;
  if (!user) return;

  const { data, error } = await state.client
    .from("admin_users")
    .select("user_id,email,role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Admin lookup failed:", error);
    return;
  }

  state.adminProfile = data || null;
}

async function loadSetting() {
  state.setting = null;

  const { data, error } = await state.client
    .from("app_settings")
    .select("key,value,is_public,updated_at,updated_by")
    .eq("key", BACKEND_TEST_KEY)
    .maybeSingle();

  if (error) {
    els.settingMeta.textContent = `Could not load app_settings: ${error.message}`;
    console.warn("Setting lookup failed:", error);
    return;
  }

  state.setting = data || null;
}

async function loadBuildingRows() {
  state.buildingRows = [];
  if (!state.client || !state.adminProfile) return;

  const { data, error } = await state.client
    .from(BUILDING_LABEL_OVERRIDES_TABLE)
    .select(BUILDING_LABEL_OVERRIDE_COLUMNS)
    .order("building_number", { ascending: true });

  if (error) {
    setBuildingStatus(`Could not load building labels: ${error.message}`, "error");
    console.warn("Building label lookup failed:", error);
    return;
  }

  state.buildingRows = (data || [])
    .map(normalizeBuildingOverrideRow)
    .filter((row) => row.buildingNumber && row.displayMode === "dorm");
}

function getSnapshotValuesFromRow(row) {
  if (!row) return null;

  return {
    buildingNumber: row.buildingNumber,
    buildingId: row.buildingId,
    displayMode: row.displayMode || "dorm",
    type: row.type || "dorm",
    name: row.name,
    shortName: row.shortName,
    labelEnabled: row.labelEnabled !== false,
    interactive: !!row.interactive,
    dormTag: row.dorm?.tag || "",
    dormRentText: row.dorm?.rentText || "",
    dormType: row.dorm?.type || "",
    dormLocation: row.dorm?.location || "",
    dormSummary: row.dorm?.summary || "",
    dormDescription: row.dorm?.description || row.dorm?.summary || "",
    dormBestFor: row.dorm?.bestFor || "",
    dormLocationFeel: row.dorm?.locationFeel || "",
    dormTradeOff: row.dorm?.tradeOff || ""
  };
}

function createSnapshotPayload(row) {
  const values = getSnapshotValuesFromRow(row);
  if (!values) return null;
  return createBuildingOverridePayload(values, row.updatedBy || null);
}

async function saveBuildingSnapshot(row, action = "save") {
  const snapshot = createSnapshotPayload(row);
  if (!snapshot) return { error: null };

  return state.client.from(BUILDING_LABEL_HISTORY_TABLE).insert({
    building_number: row.buildingNumber,
    action,
    snapshot,
    created_by: state.session?.user?.id || null
  });
}

async function refreshAdminState() {
  if (!renderConfig()) return;

  try {
    state.client = getSupabaseClient();
    const { data, error } = await state.client.auth.getSession();
    if (error) throw error;
    state.session = data.session || null;

    if (!state.session) {
      renderLoggedOut();
      await loadSetting();
      return;
    }

    await loadAdminProfile();
    await loadSetting();
    if (state.adminProfile) {
      await loadBuildingRows();
    }
    renderSession();
    renderSetting();
    renderBuildingOptions();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Admin pilot failed to load.", "error");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  if (!state.client) state.client = getSupabaseClient();

  const email = els.email.value.trim();
  if (!email) return;

  setStatus("Sending email code...", "neutral");
  const { error } = await state.client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true
    }
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setPendingEmail(email);
  setHidden(els.otpForm, false);
  els.otpCode.value = "";
  els.otpCode.focus();
  setStatus("Email sent. Copy the newest code here; do not open the email link.", "success");
}

async function handlePasswordLogin(event) {
  event.preventDefault();
  if (!state.client) state.client = getSupabaseClient();

  const email = els.email.value.trim();
  const password = els.password.value;
  if (!email || !password) return;

  setStatus("Signing in with password...", "neutral");
  const { data, error } = await state.client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  state.session = data.session || null;
  setPendingEmail("");
  els.password.value = "";
  await refreshAdminState();
}

async function handleVerifyOtp(event) {
  event.preventDefault();
  if (!state.client) state.client = getSupabaseClient();

  const email = els.email.value.trim() || getPendingEmail();
  const token = els.otpCode.value.trim().replace(/\s+/g, "");
  if (!email || !token) return;

  setStatus("Verifying email code...", "neutral");
  const { data, error } = await state.client.auth.verifyOtp({
    email,
    token,
    type: "email"
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  state.session = data.session || null;
  setPendingEmail("");
  els.otpCode.value = "";
  await refreshAdminState();
}

async function handleSignOut() {
  if (!state.client) return;
  await state.client.auth.signOut();
  state.session = null;
  state.adminProfile = null;
  setPendingEmail("");
  renderLoggedOut();
}

async function handleSaveSetting(event) {
  event.preventDefault();
  if (!state.client || !state.session || !state.adminProfile) return;

  const text = els.settingValue.value.trim();
  setStatus("Saving test setting...", "neutral");

  const { error } = await state.client.from("app_settings").upsert({
    key: BACKEND_TEST_KEY,
    value: {
      text,
      scope: "backend-pilot"
    },
    is_public: true,
    updated_by: state.session.user.id
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  await loadSetting();
  renderSetting();
  setStatus("Test setting saved.", "success");
}

async function handleBuildingSelectChange() {
  state.selectedBuildingNumber = els.buildingSelect.value;
  fillBuildingForm(getSelectedBuildingRow());
}

function handleDisplayModeChange() {
  syncBuildingGuardRules();
}

function handleLabelEnabledChange() {
  syncBuildingGuardRules();
}

async function handleReloadBuildings() {
  if (!state.client || !state.adminProfile) return;
  setBuildingStatus("Reloading building labels...", "neutral");
  await loadBuildingRows();
  renderBuildingOptions();
}

async function handleSaveBuilding(event) {
  event.preventDefault();
  if (!state.client || !state.session || !state.adminProfile) return;

  const values = getBuildingFormValues();
  const selectedRow = getSelectedBuildingRow();
  if (selectedRow && values.buildingNumber !== selectedRow.buildingNumber) {
    setBuildingStatus("Building number is locked. Select another building instead.", "error");
    fillBuildingForm(selectedRow);
    return;
  }

  if (!confirmBuildingSave(selectedRow, values)) return;

  const payload = createBuildingOverridePayload(values, state.session.user.id);
  if (!payload.building_number) {
    setBuildingStatus("Building number is required.", "error");
    return;
  }

  setBuildingStatus("正在保存快照...", "neutral");
  const snapshotResult = await saveBuildingSnapshot(selectedRow, "save");
  if (snapshotResult.error) {
    setBuildingStatus(`保险库快照失败：${snapshotResult.error.message}`, "error");
    return;
  }

  setBuildingStatus("正在保存到数据库...", "neutral");
  const { error } = await state.client
    .from(BUILDING_LABEL_OVERRIDES_TABLE)
    .upsert(payload, { onConflict: "building_number" });

  if (error) {
    setBuildingStatus(error.message, "error");
    return;
  }

  state.selectedBuildingNumber = payload.building_number;
  await loadBuildingRows();
  renderBuildingOptions();
  setBuildingStatus("已保存到数据库。官网接入 Supabase 后，刷新页面即可看到内容更新。", "success");
}

async function handleRollbackBuilding() {
  if (!state.client || !state.session || !state.adminProfile) return;
  const buildingNumber = els.buildingNumber.value.trim();
  if (!buildingNumber) {
    setBuildingStatus("请先选择一个宿舍。", "error");
    return;
  }

  const { data, error } = await state.client
    .from(BUILDING_LABEL_HISTORY_TABLE)
    .select("id,snapshot,created_at,action")
    .eq("building_number", buildingNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    setBuildingStatus(`读取保险库失败：${error.message}`, "error");
    return;
  }

  if (!data?.snapshot) {
    setBuildingStatus("这个宿舍还没有可回退的上一版。", "warning");
    return;
  }

  const selectedRow = getSelectedBuildingRow();
  const confirmed = window.confirm(
    `确认把 ${els.displayName.value || buildingNumber} 回退到上一版？\n\n上一版时间：${
      data.created_at || "unknown"
    }`
  );
  if (!confirmed) return;

  setBuildingStatus("正在保存回退前快照...", "neutral");
  const snapshotResult = await saveBuildingSnapshot(selectedRow, "rollback-before");
  if (snapshotResult.error) {
    setBuildingStatus(`保险库快照失败：${snapshotResult.error.message}`, "error");
    return;
  }

  const restorePayload = {
    ...data.snapshot,
    updated_by: state.session.user.id
  };

  setBuildingStatus("正在回退上一版...", "neutral");
  const { error: restoreError } = await state.client
    .from(BUILDING_LABEL_OVERRIDES_TABLE)
    .upsert(restorePayload, { onConflict: "building_number" });

  if (restoreError) {
    setBuildingStatus(restoreError.message, "error");
    return;
  }

  state.selectedBuildingNumber = buildingNumber;
  await loadBuildingRows();
  renderBuildingOptions();
  setBuildingStatus("已回退到上一版。刷新官网页面即可看到恢复后的内容。", "success");
}

function handlePublishPublic() {
  setBuildingStatus(
    "发布代码到官网需要本地同步 public 仓库并 push，浏览器按钮不能安全保存 GitHub 权限。当前按钮先作为发布提醒；纯文字修改保存到数据库后无需发布代码。",
    "warning"
  );
}

els.refresh?.addEventListener("click", refreshAdminState);
els.passwordForm?.addEventListener("submit", handlePasswordLogin);
els.loginForm?.addEventListener("submit", handleLogin);
els.otpForm?.addEventListener("submit", handleVerifyOtp);
els.signOut?.addEventListener("click", handleSignOut);
els.settingsForm?.addEventListener("submit", handleSaveSetting);
els.buildingSelect?.addEventListener("change", handleBuildingSelectChange);
els.displayMode?.addEventListener("change", handleDisplayModeChange);
els.labelEnabled?.addEventListener("change", handleLabelEnabledChange);
els.buildingReload?.addEventListener("click", handleReloadBuildings);
els.buildingForm?.addEventListener("submit", handleSaveBuilding);
els.rollbackBuilding?.addEventListener("click", handleRollbackBuilding);
els.publishPublic?.addEventListener("click", handlePublishPublic);

renderConfig();
refreshAdminState();
