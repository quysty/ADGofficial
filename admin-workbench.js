import { getSupabaseClient, getSupabaseConfigStatus } from "./src/backend/supabaseClient.js";
import {
  BUILDING_LABEL_OVERRIDE_COLUMNS,
  BUILDING_LABEL_OVERRIDES_TABLE,
  createBuildingOverridePayload,
  normalizeBuildingOverrideRow
} from "./src/backend/buildingOverrides.js";
import {
  BUILDING_HEIGHT_HISTORY_TABLE,
  BUILDING_HEIGHT_OVERRIDE_COLUMNS,
  BUILDING_HEIGHT_OVERRIDES_TABLE,
  createBuildingHeightDraftPayload,
  createBuildingHeightPublishPayload,
  createBuildingHeightSnapshot,
  normalizeBuildingHeightOverrideRow
} from "./src/backend/buildingHeights.js";

const PENDING_EMAIL_KEY = "anu_explore_admin_pending_email";
const BUILDING_LABEL_HISTORY_TABLE = "building_label_override_history";
const MAX_HEIGHT_TARGETS = 5;
const MAX_HEIGHT_MULTIPLIER = 10;

const els = {
  status: document.querySelector("#adminStatus"),
  publishState: document.querySelector("#adminPublishState"),
  userName: document.querySelector("#adminUserName"),
  avatarButton: document.querySelector("#adminAvatarButton"),
  avatarInitial: document.querySelector("#adminAvatarInitial"),
  accountMenu: document.querySelector("#adminAccountMenu"),
  accountEmail: document.querySelector("#adminAccountEmail"),
  accountRole: document.querySelector("#adminAccountRole"),
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
  workspace: document.querySelector("#adminWorkspace"),
  sideNav: document.querySelector(".admin-side-nav"),
  navItems: [...document.querySelectorAll("[data-admin-section]")],
  panels: [...document.querySelectorAll("[data-admin-panel]")],
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
  dormBestFor: document.querySelector("#adminDormBestFor"),
  dormLocationFeel: document.querySelector("#adminDormLocationFeel"),
  dormTradeOff: document.querySelector("#adminDormTradeOff"),
  rollbackBuilding: document.querySelector("#adminRollbackBuilding"),
  publishDorm: document.querySelector("#adminPublishDorm"),
  heightPanel: document.querySelector("#adminHeightPanel"),
  heightReload: document.querySelector("#adminHeightReload"),
  heightStatus: document.querySelector("#adminHeightStatus"),
  heightForm: document.querySelector("#adminHeightForm"),
  heightSave: document.querySelector("#adminHeightForm button[type='submit']"),
  heightBuildingSelect: document.querySelector("#adminHeightBuildingSelect"),
  heightMultiplier: document.querySelector("#adminHeightMultiplier"),
  heightCopyFrom: document.querySelector("#adminHeightCopyFrom"),
  heightTargets: [...document.querySelectorAll(".admin-height-target")],
  clearHeightTargets: document.querySelector("#adminClearHeightTargets"),
  heightCurrent: document.querySelector("#adminHeightCurrent"),
  heightBase: document.querySelector("#adminHeightBase"),
  heightPublished: document.querySelector("#adminHeightPublished"),
  previewHeight: document.querySelector("#adminPreviewHeight"),
  publishHeight: document.querySelector("#adminPublishHeight"),
  rollbackHeight: document.querySelector("#adminRollbackHeight"),
  previewTitle: document.querySelector("#adminPreviewTitle"),
  previewStatus: document.querySelector("#adminPreviewStatus"),
  mapFrame: document.querySelector("#adminMapFrame")
};

const state = {
  client: null,
  session: null,
  adminProfile: null,
  activeSection: "home",
  buildingRows: [],
  selectedBuildingNumber: "",
  dormPreviewActive: false,
  heightRows: [],
  heightCatalog: [],
  selectedHeightNumber: "",
  heightPreviewActive: false,
  pendingReloadBuildingNumber: "",
  pendingReloadHeightNumber: "",
  mapReady: false
};

document.body.dataset.adminSection = state.activeSection;

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

const DORM_DEFAULTS = Array.isArray(window.DORM_DATA) ? window.DORM_DATA : [];

function setHidden(element, hidden) {
  if (element) element.hidden = hidden;
}

function setStatus(message, tone = "neutral") {
  if (els.status) {
    els.status.textContent = message;
    els.status.dataset.tone = tone;
  }
  if (els.publishState) {
    els.publishState.textContent = message;
    els.publishState.dataset.tone = tone;
  }
}

function setBuildingStatus(message, tone = "neutral") {
  els.buildingStatus.textContent = message;
  els.buildingStatus.dataset.tone = tone;
}

function setHeightStatus(message, tone = "neutral") {
  els.heightStatus.textContent = message;
  els.heightStatus.dataset.tone = tone;
}

function setButtonBusy(button, busy, busyLabel = "处理中...") {
  if (!button) return;
  if (busy) {
    button.dataset.idleLabel = button.dataset.idleLabel || button.textContent.trim();
    button.textContent = busyLabel;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    return;
  }

  button.textContent = button.dataset.idleLabel || button.textContent;
  button.disabled = false;
  button.removeAttribute("aria-busy");
}

function cleanText(value) {
  return String(value || "").trim();
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

function getAdminLevel() {
  return state.adminProfile ? "Clevel" : "No access";
}

function updateAccountChrome() {
  const email = state.session?.user?.email || "Not signed in";
  const name = email.includes("@") ? email.split("@")[0] : email;
  const initial = (name || "A").slice(0, 1).toUpperCase();

  els.userName.textContent = name || "Admin";
  els.avatarInitial.textContent = initial;
  els.accountEmail.textContent = email;
  els.accountRole.textContent = `Permission: ${getAdminLevel()}`;
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
  setHidden(els.workspace, true);
  updateAccountChrome();

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
  updateAccountChrome();

  if (!state.adminProfile) {
    els.roleText.textContent =
      "Signed in, but this user is not in admin_users yet. Run the SQL below in Supabase SQL Editor once.";
    renderBootstrapSql(user);
    setHidden(els.bootstrapSql, false);
    setHidden(els.workspace, true);
    setStatus("Signed in without admin permission.", "warning");
    return;
  }

  els.roleText.textContent = `Admin permission active: ${getAdminLevel()}.`;
  setHidden(els.bootstrapSql, true);
  setHidden(els.sessionPanel, true);
  setHidden(els.workspace, false);
  setStatus("权限已启用", "success");
}

function switchAdminSection(section) {
  state.activeSection = section;
  document.body.dataset.adminSection = section;
  state.dormPreviewActive = false;
  state.heightPreviewActive = false;
  els.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.adminSection === section);
  });
  els.panels.forEach((panel) => {
    setHidden(panel, panel.dataset.adminPanel !== section);
  });

  if (section === "home") {
    if (els.previewTitle) els.previewTitle.textContent = "预览首页";
  } else if (section === "dorm") {
    if (els.previewTitle) els.previewTitle.textContent = "宿舍详情编辑";
  } else {
    if (els.previewTitle) els.previewTitle.textContent = "建筑高度管理";
  }
  sendMapOverview();
}

function getSelectedBuildingRow() {
  return state.buildingRows.find(
    (row) => row.buildingNumber === state.selectedBuildingNumber
  ) || null;
}

function getDefaultDormForRow(row) {
  if (!row) return null;
  const buildingId = row.buildingId || "";
  const dormId = buildingId.replace(/^dorm_/, "");
  return DORM_DEFAULTS.find(
    (dorm) =>
      dorm?.buildingId === buildingId ||
      dorm?.mapFocus === buildingId ||
      dorm?.id === dormId
  ) || null;
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

function setFieldValue(element, value) {
  if (!element) return;
  element.value = value || "";
}

function syncBuildingGuardRules() {
  els.buildingGuard.textContent =
    "当前功能只允许维护宿舍名称、地图标签和宿舍详情文字。楼号、内部 ID、建筑类型、颜色和点击权限已锁定。";
}

function fillBuildingForm(row, options = {}) {
  const fallback = row || {};
  const defaultDorm = getDefaultDormForRow(fallback);
  setFieldValue(els.buildingNumber, fallback.buildingNumber);
  setFieldValue(els.buildingId, fallback.buildingId);
  setFieldValue(els.displayMode, "dorm");
  setFieldValue(els.typeKey, "dorm");
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
  setFieldValue(els.dormLocationFeel, firstText(fallback.dorm?.locationFeel, defaultDorm?.locationFeel));
  setFieldValue(els.dormTradeOff, firstText(fallback.dorm?.tradeOff, defaultDorm?.tradeOff));
  syncBuildingGuardRules();
  if (options.preview) {
    state.dormPreviewActive = true;
    sendDormPreview();
  }
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

  const preferredBuildingNumber = state.pendingReloadBuildingNumber || state.selectedBuildingNumber;
  if (
    preferredBuildingNumber &&
    state.buildingRows.some((row) => row.buildingNumber === preferredBuildingNumber)
  ) {
    state.selectedBuildingNumber = preferredBuildingNumber;
  } else if (
    !state.selectedBuildingNumber ||
    !state.buildingRows.some((row) => row.buildingNumber === state.selectedBuildingNumber)
  ) {
    state.selectedBuildingNumber = state.buildingRows[0].buildingNumber;
  }
  state.pendingReloadBuildingNumber = "";

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

  return {
    buildingNumber: selectedRow?.buildingNumber || els.buildingNumber.value,
    buildingId: selectedRow?.buildingId || els.buildingId.value,
    displayMode: "dorm",
    type: "dorm",
    name: els.displayName.value,
    shortName: els.shortName.value,
    labelEnabled: selectedRow?.labelEnabled !== false,
    interactive: !!selectedRow?.interactive,
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

function getBuildingChangeSummary(previousRow, nextValues) {
  const previous = rowToComparableValues(previousRow);
  return Object.entries(EDITABLE_FIELD_LABELS)
    .map(([key, label]) => {
      const beforeValue = cleanText(previous[key]);
      const afterValue = cleanText(nextValues[key]);
      if (beforeValue === afterValue) return null;
      return `${label}: ${beforeValue || "空"} -> ${afterValue || "空"}`;
    })
    .filter(Boolean);
}

function createBuildingSnapshotPayload(row) {
  if (!row) return null;
  return createBuildingOverridePayload({
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
  }, row.updatedBy || null);
}

async function saveBuildingSnapshot(row, action = "save") {
  const snapshot = createBuildingSnapshotPayload(row);
  if (!snapshot) return { error: null };
  return state.client.from(BUILDING_LABEL_HISTORY_TABLE).insert({
    building_number: row.buildingNumber,
    action,
    snapshot,
    created_by: state.session?.user?.id || null
  });
}

function getHeightRow(buildingNumber = state.selectedHeightNumber) {
  return state.heightRows.find((row) => row.buildingNumber === String(buildingNumber)) || null;
}

function getHeightCatalogItem(buildingNumber = state.selectedHeightNumber) {
  return state.heightCatalog.find((item) => item.buildingNumber === String(buildingNumber)) || null;
}

function formatHeightNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  return `${parsed.toFixed(1).replace(/\.0$/, "")}`;
}

function createBuildingOption(item, emptyLabel = "不复制") {
  const option = document.createElement("option");
  option.value = item?.buildingNumber || "";
  option.textContent = item
    ? `${item.name || "Building"} · ${item.buildingNumber}`
    : emptyLabel;
  return option;
}

function fillBuildingSelect(select, includeEmpty = false) {
  select.innerHTML = "";
  if (includeEmpty) select.appendChild(createBuildingOption(null));
  state.heightCatalog.forEach((item) => select.appendChild(createBuildingOption(item)));
}

function renderHeightOptions() {
  fillBuildingSelect(els.heightBuildingSelect);
  fillBuildingSelect(els.heightCopyFrom, true);
  els.heightTargets.forEach((select) => fillBuildingSelect(select, true));

  const preferredHeightNumber = state.pendingReloadHeightNumber || state.selectedHeightNumber;
  if (
    preferredHeightNumber &&
    state.heightCatalog.some((item) => item.buildingNumber === preferredHeightNumber)
  ) {
    state.selectedHeightNumber = preferredHeightNumber;
  } else if (
    !state.selectedHeightNumber ||
    !state.heightCatalog.some((item) => item.buildingNumber === state.selectedHeightNumber)
  ) {
    state.selectedHeightNumber = state.heightCatalog[0]?.buildingNumber || "";
  }
  state.pendingReloadHeightNumber = "";

  els.heightBuildingSelect.value = state.selectedHeightNumber;
  if (els.heightTargets[0]) els.heightTargets[0].value = state.selectedHeightNumber;
  renderHeightForm();
}

function renderHeightForm(options = {}) {
  const row = getHeightRow();
  const catalog = getHeightCatalogItem();
  const multiplier = row?.draftMultiplier || row?.publishedMultiplier || 1;
  const copyFrom = row?.draftCopyFrom || row?.publishedCopyFrom || "";

  els.heightMultiplier.value = String(multiplier);
  els.heightCopyFrom.value = copyFrom;
  if (els.heightCurrent) {
    els.heightCurrent.textContent = `当前高度：${formatHeightNumber(catalog?.currentHeight)}`;
  }
  els.heightBase.textContent = `原始高度：${formatHeightNumber(catalog?.baseHeight || catalog?.currentHeight)}`;
  els.heightPublished.textContent = row?.publishedMultiplier || row?.publishedCopyFrom
    ? `已发布：${row.publishedCopyFrom ? `复制 ${row.publishedCopyFrom}` : ""}${row.publishedMultiplier ? ` × ${row.publishedMultiplier}` : ""}`
    : "已发布：无";

  setHeightStatus(
    state.heightCatalog.length
      ? `已载入 ${state.heightCatalog.length} 栋建筑。草稿可累计保存，点击“统一发布草稿”后官网刷新才会读取。`
      : "等待地图预览载入建筑清单...",
    state.heightCatalog.length ? "success" : "neutral"
  );
  if (options.preview) {
    state.heightPreviewActive = true;
    sendHeightPreview();
  }
}

function getHeightTargetNumbers() {
  const targets = els.heightTargets
    .map((select) => cleanText(select.value))
    .filter(Boolean);
  if (!targets.includes(state.selectedHeightNumber)) targets.unshift(state.selectedHeightNumber);
  return [...new Set(targets)].slice(0, MAX_HEIGHT_TARGETS);
}

function getHeightFormValues(buildingNumber = state.selectedHeightNumber) {
  return {
    buildingNumber,
    multiplier: Number(els.heightMultiplier.value) || 1,
    copyFromBuildingNumber: cleanText(els.heightCopyFrom.value)
  };
}

function validateHeightFormValues(values) {
  if (!values.buildingNumber) return "请至少选择一个建筑。";
  if (!Number.isFinite(values.multiplier) || values.multiplier <= 0) return "高度乘数必须大于 0。";
  if (values.multiplier > MAX_HEIGHT_MULTIPLIER) return `高度乘数最高支持 ${MAX_HEIGHT_MULTIPLIER} 倍。`;
  return "";
}

function setHeightCatalog(buildings) {
  const labelRowsByNumber = Object.fromEntries(
    state.buildingRows.map((row) => [row.buildingNumber, row])
  );

  state.heightCatalog = (buildings || [])
    .map((building) => {
      const labelRow = labelRowsByNumber[building.buildingNumber];
      return {
        ...building,
        name: labelRow?.name || building.name || `Building ${building.buildingNumber}`
      };
    })
    .sort((a, b) => Number(a.buildingNumber) - Number(b.buildingNumber));

  renderHeightOptions();
}

function postMapMessage(message) {
  if (!els.mapFrame?.contentWindow) return;
  els.mapFrame.contentWindow.postMessage(
    {
      source: "anu-admin",
      ...message
    },
    window.location.origin
  );
}

function reloadMapPreview(reason = "manual") {
  if (!els.mapFrame) return;

  state.mapReady = false;
  state.heightCatalog = [];
  els.previewStatus.textContent = "正在重新载入地图...";

  const nextUrl = new URL(els.mapFrame.src || "explore.html", window.location.href);
  nextUrl.searchParams.set("adminReload", String(Date.now()));
  nextUrl.searchParams.set("reloadReason", reason);
  els.mapFrame.src = nextUrl.toString();
}

function sendMapOverview() {
  if (!state.mapReady) return;
  postMapMessage({
    type: "overview-preview",
    mode: state.activeSection
  });
}

function sendDormPreview() {
  if (!state.mapReady || state.activeSection !== "dorm") return;
  const values = getBuildingFormValues();
  if (!values.buildingNumber) return;
  postMapMessage({
    type: "dorm-preview",
    buildingNumber: values.buildingNumber,
    preview: {
      name: values.name,
      shortName: values.shortName,
      tag: values.dormTag,
      rentText: values.dormRentText,
      type: values.dormType,
      location: values.dormLocation,
      summary: values.dormSummary,
      bestFor: values.dormBestFor,
      locationFeel: values.dormLocationFeel,
      tradeOff: values.dormTradeOff
    }
  });
}

function sendHeightPreview() {
  if (!state.mapReady || state.activeSection !== "height") return;
  if (!state.selectedHeightNumber) return;
  postMapMessage({
    type: "height-preview",
    preview: {
      buildingNumber: state.selectedHeightNumber,
      buildingNumbers: getHeightTargetNumbers(),
      multiplier: Number(els.heightMultiplier.value) || 1,
      copyFromBuildingNumber: cleanText(els.heightCopyFrom.value)
    }
  });
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

async function loadBuildingRows() {
  state.buildingRows = [];
  if (!state.client || !state.adminProfile) return;

  const { data, error } = await state.client
    .from(BUILDING_LABEL_OVERRIDES_TABLE)
    .select(BUILDING_LABEL_OVERRIDE_COLUMNS)
    .order("building_number", { ascending: true });

  if (error) {
    setBuildingStatus(`Could not load building labels: ${error.message}`, "error");
    return;
  }

  state.buildingRows = (data || [])
    .map(normalizeBuildingOverrideRow)
    .filter((row) => row.buildingNumber && row.displayMode === "dorm");
}

async function loadHeightRows() {
  state.heightRows = [];
  if (!state.client || !state.adminProfile) return;

  const { data, error } = await state.client
    .from(BUILDING_HEIGHT_OVERRIDES_TABLE)
    .select(BUILDING_HEIGHT_OVERRIDE_COLUMNS)
    .order("building_number", { ascending: true });

  if (error) {
    setHeightStatus(`高度表还不可用：请先运行 supabase/patch-building-height-overrides.sql。${error.message}`, "warning");
    return;
  }

  state.heightRows = (data || []).map(normalizeBuildingHeightOverrideRow);
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
      return;
    }

    await loadAdminProfile();
    if (state.adminProfile) {
      await loadBuildingRows();
      await loadHeightRows();
    }
    renderSession();
    renderBuildingOptions();
    renderHeightOptions();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Admin workbench failed to load.", "error");
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
    options: { shouldCreateUser: true }
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
  const { data, error } = await state.client.auth.signInWithPassword({ email, password });

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

async function handleBuildingSelectChange() {
  state.selectedBuildingNumber = els.buildingSelect.value;
  fillBuildingForm(getSelectedBuildingRow(), { preview: true });
}

async function handleReloadBuildings() {
  if (!state.client || !state.adminProfile) return;
  state.pendingReloadBuildingNumber = state.selectedBuildingNumber || els.buildingSelect?.value || "";
  setBuildingStatus("正在重新载入宿舍内容和地图预览...", "neutral");
  await loadBuildingRows();
  renderBuildingOptions();
  state.dormPreviewActive = true;
  reloadMapPreview("dorm");
  if (state.buildingRows.length) {
    setBuildingStatus(`已重新载入 ${state.buildingRows.length} 个宿舍，右侧地图正在刷新。`, "success");
  }
}

async function handleSaveBuilding(event) {
  event.preventDefault();
  if (!state.client || !state.session || !state.adminProfile) return;

  const values = getBuildingFormValues();
  const selectedRow = getSelectedBuildingRow();
  const changes = getBuildingChangeSummary(selectedRow, values);

  if (!changes.length) {
    setBuildingStatus("没有需要保存的改动。", "neutral");
    return;
  }

  if (!window.confirm(`确认保存 ${values.name || values.buildingNumber} 的这些内容改动？\n\n${changes.join("\n")}`)) {
    return;
  }

  const snapshotResult = await saveBuildingSnapshot(selectedRow, "save");
  if (snapshotResult.error) {
    setBuildingStatus(`保险库快照失败：${snapshotResult.error.message}`, "error");
    return;
  }

  const payload = createBuildingOverridePayload(values, state.session.user.id);
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
  setBuildingStatus("已保存到数据库。官网刷新后会读取宿舍文字更新。", "success");
}

async function handleRollbackBuilding() {
  if (!state.client || !state.session || !state.adminProfile) return;
  const buildingNumber = els.buildingNumber.value.trim();
  if (!buildingNumber) return;

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

  if (!window.confirm(`确认把 ${els.displayName.value || buildingNumber} 回退到上一版？\n\n上一版时间：${data.created_at || "unknown"}`)) {
    return;
  }

  const selectedRow = getSelectedBuildingRow();
  const snapshotResult = await saveBuildingSnapshot(selectedRow, "rollback-before");
  if (snapshotResult.error) {
    setBuildingStatus(`保险库快照失败：${snapshotResult.error.message}`, "error");
    return;
  }

  const restorePayload = {
    ...data.snapshot,
    updated_by: state.session.user.id
  };
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
  setBuildingStatus("已回退当前宿舍。", "success");
}

async function saveHeightSnapshot(row, action = "save") {
  const snapshot = createBuildingHeightSnapshot(row);
  if (!snapshot) return { error: null };
  return state.client.from(BUILDING_HEIGHT_HISTORY_TABLE).insert({
    building_number: row.buildingNumber,
    action,
    snapshot,
    created_by: state.session?.user?.id || null
  });
}

function getDraftHeightRows() {
  return state.heightRows.filter((row) => row.status === "draft");
}

function getHeightPublishValuesFromRow(row) {
  return {
    buildingNumber: row.buildingNumber,
    multiplier: row.draftMultiplier || 1,
    copyFromBuildingNumber: row.draftCopyFrom || ""
  };
}

async function writeHeightRows(mode, triggerButton = null) {
  if (!state.client || !state.session || !state.adminProfile) return;
  const targets = getHeightTargetNumbers();
  if (!targets.length) {
    setHeightStatus("请至少选择一个建筑。", "error");
    return;
  }

  const validationMessage = validateHeightFormValues(getHeightFormValues(targets[0]));
  if (validationMessage) {
    setHeightStatus(validationMessage, "error");
    return;
  }

  if (!window.confirm(`${mode === "publish" ? "手动发布" : "保存草稿"}这些建筑高度？\n\n${targets.join(", ")}`)) {
    setHeightStatus("已取消保存高度草稿。", "neutral");
    return;
  }

  const actionButton = triggerButton || els.heightSave;
  setButtonBusy(actionButton, true, mode === "publish" ? "发布中..." : "保存中...");
  setHeightStatus(mode === "publish" ? "正在发布建筑高度..." : "正在保存高度草稿...", "neutral");

  try {
    for (const buildingNumber of targets) {
      const existing = getHeightRow(buildingNumber);
      const snapshotResult = await saveHeightSnapshot(existing, mode === "publish" ? "publish" : "draft");
      if (snapshotResult.error) {
        setHeightStatus(`保险库快照失败：${snapshotResult.error.message}`, "error");
        return;
      }
    }

    const createPayload = mode === "publish"
      ? createBuildingHeightPublishPayload
      : createBuildingHeightDraftPayload;
    const payloads = targets.map((buildingNumber) =>
      createPayload(getHeightFormValues(buildingNumber), state.session.user.id)
    );

    const { error } = await state.client
      .from(BUILDING_HEIGHT_OVERRIDES_TABLE)
      .upsert(payloads, { onConflict: "building_number" });

    if (error) {
      setHeightStatus(`数据库写入失败：${error.message}`, "error");
      return;
    }

    await loadHeightRows();
    renderHeightForm({ preview: state.heightPreviewActive });
    const draftCount = getDraftHeightRows().length;
    setHeightStatus(
      mode === "publish"
        ? "已手动发布。官网刷新后会读取新的建筑高度。"
        : `已保存 ${targets.length} 个建筑草稿。当前共有 ${draftCount} 个待发布高度草稿。`,
      "success"
    );
  } finally {
    setButtonBusy(actionButton, false);
  }
}

async function publishAllHeightDrafts() {
  if (!state.client || !state.session || !state.adminProfile) return;
  setButtonBusy(els.publishHeight, true, "发布中...");
  setHeightStatus("正在检查待发布高度草稿...", "neutral");

  try {
    const draftRows = getDraftHeightRows();
    if (!draftRows.length) {
      setHeightStatus("没有待发布的高度草稿。先保存草稿，再统一发布。", "neutral");
      return;
    }

    const invalidRow = draftRows.find((row) =>
      Boolean(validateHeightFormValues(getHeightPublishValuesFromRow(row)))
    );
    if (invalidRow) {
      setHeightStatus(`${invalidRow.buildingNumber} 的高度草稿超出限制，请先修正后再统一发布。`, "error");
      return;
    }

    const labels = draftRows.map((row) => row.buildingNumber).join(", ");
    if (!window.confirm(`统一发布全部高度草稿？\n\n共 ${draftRows.length} 个建筑：${labels}`)) {
      setHeightStatus("已取消统一发布。", "neutral");
      return;
    }

    for (const row of draftRows) {
      const snapshotResult = await saveHeightSnapshot(row, "publish-all");
      if (snapshotResult.error) {
        setHeightStatus(`保险库快照失败：${snapshotResult.error.message}`, "error");
        return;
      }
    }

    const payloads = draftRows.map((row) =>
      createBuildingHeightPublishPayload(getHeightPublishValuesFromRow(row), state.session.user.id)
    );

    const { error } = await state.client
      .from(BUILDING_HEIGHT_OVERRIDES_TABLE)
      .upsert(payloads, { onConflict: "building_number" });

    if (error) {
      setHeightStatus(`统一发布失败：${error.message}`, "error");
      return;
    }

    await loadHeightRows();
    renderHeightForm({ preview: state.heightPreviewActive });
    setHeightStatus(`已统一发布 ${payloads.length} 个高度草稿。官网刷新后会读取最新高度。`, "success");
  } finally {
    setButtonBusy(els.publishHeight, false);
  }
}

async function handleRollbackHeight() {
  if (!state.client || !state.session || !state.adminProfile) return;
  const buildingNumber = state.selectedHeightNumber;
  if (!buildingNumber) return;
  setButtonBusy(els.rollbackHeight, true, "回退中...");
  setHeightStatus(`正在读取 ${buildingNumber} 的上一版高度...`, "neutral");

  try {
    const { data, error } = await state.client
      .from(BUILDING_HEIGHT_HISTORY_TABLE)
      .select("id,snapshot,created_at,action")
      .eq("building_number", buildingNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setHeightStatus(`读取高度保险库失败：${error.message}`, "error");
      return;
    }

    if (!data?.snapshot) {
      setHeightStatus("这个建筑高度还没有可回退的上一版。", "warning");
      return;
    }

    if (!window.confirm(`确认回退 ${buildingNumber} 的高度？\n\n上一版时间：${data.created_at || "unknown"}`)) {
      setHeightStatus("已取消回退。", "neutral");
      return;
    }

    const existing = getHeightRow(buildingNumber);
    const snapshotResult = await saveHeightSnapshot(existing, "rollback-before");
    if (snapshotResult.error) {
      setHeightStatus(`保险库快照失败：${snapshotResult.error.message}`, "error");
      return;
    }

    const restorePayload = {
      ...data.snapshot,
      updated_by: state.session.user.id
    };
    const { error: restoreError } = await state.client
      .from(BUILDING_HEIGHT_OVERRIDES_TABLE)
      .upsert(restorePayload, { onConflict: "building_number" });

    if (restoreError) {
      setHeightStatus(restoreError.message, "error");
      return;
    }

    await loadHeightRows();
    renderHeightForm();
    setHeightStatus("已回退当前建筑高度。", "success");
  } finally {
    setButtonBusy(els.rollbackHeight, false);
  }
}

function handleClearHeightTargets() {
  els.heightTargets.forEach((select, index) => {
    select.value = index === 0 ? state.selectedHeightNumber : "";
  });
  state.heightPreviewActive = true;
  sendHeightPreview();
}

function handlePublishDorm() {
  setBuildingStatus(
    "宿舍文字保存到数据库后，官网刷新即可读取。这个发布按钮先保留为发布入口；后续可升级为宿舍文字草稿/发布双版本。",
    "warning"
  );
}

function handleMapMessage(event) {
  if (event.origin !== window.location.origin) return;
  const message = event.data || {};
  if (message.source !== "anu-explore-preview") return;

  if (message.type === "ready") {
    state.mapReady = true;
    els.previewStatus.textContent = "Map ready";
    setHeightCatalog(message.buildings || []);
    if (state.activeSection === "dorm" && state.dormPreviewActive) {
      sendDormPreview();
    } else if (state.activeSection === "height" && state.heightPreviewActive) {
      sendHeightPreview();
    } else {
      sendMapOverview();
    }
    return;
  }

  if (message.type === "select-building") {
    const buildingNumber = cleanText(message.buildingNumber);
    if (!buildingNumber) return;

    if (state.activeSection === "dorm") {
      const row = state.buildingRows.find((item) => item.buildingNumber === buildingNumber);
      if (!row) {
        setBuildingStatus(`建筑 ${buildingNumber} 不是可编辑宿舍。`, "warning");
        return;
      }
      state.selectedBuildingNumber = row.buildingNumber;
      els.buildingSelect.value = row.buildingNumber;
      fillBuildingForm(row, { preview: true });
      return;
    }

    if (state.activeSection === "height") {
      if (!state.heightCatalog.some((item) => item.buildingNumber === buildingNumber)) return;
      state.selectedHeightNumber = buildingNumber;
      els.heightBuildingSelect.value = buildingNumber;
      els.heightTargets[0].value = buildingNumber;
      renderHeightForm({ preview: true });
    }
  }
}

function requestMapBuildings() {
  postMapMessage({ type: "get-buildings" });
}

els.avatarButton?.addEventListener("click", () => {
  const nextHidden = !els.accountMenu.hidden;
  setHidden(els.accountMenu, nextHidden);
  els.avatarButton.setAttribute("aria-expanded", nextHidden ? "false" : "true");
});
els.passwordForm?.addEventListener("submit", handlePasswordLogin);
els.loginForm?.addEventListener("submit", handleLogin);
els.otpForm?.addEventListener("submit", handleVerifyOtp);
els.signOut?.addEventListener("click", handleSignOut);
els.navItems.forEach((item) => {
  item.addEventListener("click", () => switchAdminSection(item.dataset.adminSection));
});
els.sideNav?.addEventListener("pointerenter", () => {
  els.sideNav.classList.add("is-expanded");
});
els.sideNav?.addEventListener("pointerleave", () => {
  els.sideNav.classList.remove("is-expanded");
});
els.sideNav?.addEventListener("focusin", () => {
  els.sideNav.classList.add("is-expanded");
});
els.sideNav?.addEventListener("focusout", (event) => {
  if (!els.sideNav.contains(event.relatedTarget)) {
    els.sideNav.classList.remove("is-expanded");
  }
});
els.buildingSelect?.addEventListener("change", handleBuildingSelectChange);
els.buildingReload?.addEventListener("click", handleReloadBuildings);
els.buildingForm?.addEventListener("submit", handleSaveBuilding);
els.rollbackBuilding?.addEventListener("click", handleRollbackBuilding);
els.publishDorm?.addEventListener("click", handlePublishDorm);
[
  els.displayName,
  els.shortName,
  els.dormTag,
  els.dormRent,
  els.dormType,
  els.dormLocation,
  els.dormSummary,
  els.dormBestFor,
  els.dormLocationFeel,
  els.dormTradeOff
].forEach((field) => field?.addEventListener("input", sendDormPreview));
els.heightBuildingSelect?.addEventListener("change", () => {
  state.selectedHeightNumber = els.heightBuildingSelect.value;
  els.heightTargets[0].value = state.selectedHeightNumber;
  renderHeightForm({ preview: true });
});
els.heightMultiplier?.addEventListener("input", () => {
  state.heightPreviewActive = true;
  sendHeightPreview();
});
els.heightCopyFrom?.addEventListener("change", () => {
  state.heightPreviewActive = true;
  sendHeightPreview();
});
els.heightTargets.forEach((select) => select.addEventListener("change", () => {
  state.heightPreviewActive = true;
  sendHeightPreview();
}));
els.clearHeightTargets?.addEventListener("click", handleClearHeightTargets);
els.previewHeight?.addEventListener("click", sendHeightPreview);
els.heightReload?.addEventListener("click", async () => {
  if (!state.client || !state.adminProfile) return;
  state.pendingReloadHeightNumber = state.selectedHeightNumber || els.heightBuildingSelect?.value || "";
  setHeightStatus("正在重新载入高度草稿和地图建筑清单...", "neutral");
  await loadHeightRows();
  state.heightPreviewActive = true;
  reloadMapPreview("height");
  setHeightStatus("已重新读取高度草稿，右侧地图正在刷新建筑清单。", "success");
});
els.heightForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  writeHeightRows("draft", event.submitter || els.heightSave);
});
els.publishHeight?.addEventListener("click", publishAllHeightDrafts);
els.rollbackHeight?.addEventListener("click", handleRollbackHeight);
els.mapFrame?.addEventListener("load", requestMapBuildings);
window.addEventListener("message", handleMapMessage);

renderConfig();
refreshAdminState();
