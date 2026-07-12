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
import {
  PUBLIC_PAGE_PUBLISH_REQUESTS_TABLE,
  PUBLIC_PAGE_PUBLISH_SCOPES,
  enqueuePublicPagePublishRequest,
  invokePublicPagePublishRequest
} from "./src/backend/publicPublishRequests.js?v=admin-publish-auth-v5";

const PENDING_EMAIL_KEY = "anu_explore_admin_pending_email";
const BUILDING_LABEL_HISTORY_TABLE = "building_label_override_history";
const ADMIN_OPERATION_LOG_TABLE = "admin_operation_logs";
const ADMIN_OPERATION_LOG_COLUMNS =
  "id,created_at,actor_email,permission_level,action,entity_type,entity_id,target_table,status,summary,details";
const PUBLIC_PAGE_PUBLISH_ALLOWED_SCOPES = [
  PUBLIC_PAGE_PUBLISH_SCOPES.DORM_DETAILS,
  PUBLIC_PAGE_PUBLISH_SCOPES.BUILDING_HEIGHTS,
  PUBLIC_PAGE_PUBLISH_SCOPES.SITE_PAGES
];
const MAX_HEIGHT_TARGETS = 5;
const MAX_HEIGHT_MULTIPLIER = 10;
const SITE_PAGES_CONFIG_PATH = "config/site-pages.json";
const SITE_PAGES_PUBLISHED_CONFIG_PATH = "config/published/site-pages.json";
const FUNCTIONAL_BUILDINGS_CONFIG_PATH = "config/functional-buildings.json";
const ADMIN_MAP_TOOL_FRAME = "site-pages-overview-v1";
const NORMAL_MAP_FRAME = "site-pages-overview-v1";
const ADMIN_THEME_STORAGE_KEY = "anu_explore_admin_theme";
const ADMIN_MAP_TOOL_SECTIONS = {
  "tool-entrance": {
    mode: "entrance",
    title: "入口工具",
    hint: "鼠标模式下只浏览地图；切到选点模式后，点击 3D 地图记录入口坐标。"
  },
  "tool-boundary": {
    mode: "boundary",
    title: "圈地工具",
    hint: "鼠标模式下只浏览地图；切到圈地模式后，右键添加边界点，靠近第 1 点右键闭合。"
  },
  "tool-road": {
    mode: "road",
    title: "道路工具",
    hint: "鼠标模式下只浏览地图；切到选点模式后，可新增道路点或标记删除道路段。"
  },
  "tool-camera": {
    mode: "camera",
    title: "摄像机工具",
    hint: "用于调试聚焦美术视角。焦点固定在地面，网格用于判断相机落点。"
  },
  "tool-director": {
    mode: "camera",
    title: "导演工具",
    hint: "像游戏导演一样取景：点击右侧地图后用鼠标、滚轮、WASD、方向键和 Q/E 移动视角，再记录当前镜头。",
    director: true
  }
};

const els = {
  status: document.querySelector("#adminStatus"),
  publishState: document.querySelector("#adminPublishState"),
  userName: document.querySelector("#adminUserName"),
  themeChoices: [...document.querySelectorAll("[data-admin-theme-choice]")],
  avatarButton: document.querySelector("#adminAvatarButton"),
  avatarImage: document.querySelector("#adminAvatarImage"),
  avatarInitial: document.querySelector("#adminAvatarInitial"),
  accountMenu: document.querySelector("#adminAccountMenu"),
  accountName: document.querySelector("#adminAccountName"),
  accountEmail: document.querySelector("#adminAccountEmail"),
  accountStatus: document.querySelector("#adminAccountStatus"),
  accountRole: document.querySelector("#adminAccountRole"),
  accountConnection: document.querySelector("#adminAccountConnection"),
  accountLogin: document.querySelector("#adminAccountLogin"),
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
  homeProjectName: document.querySelector("#adminHomeProjectName"),
  homePublicUrl: document.querySelector("#adminHomePublicUrl"),
  homeCopyUrl: document.querySelector("#adminHomeCopyUrl"),
  homePublicPages: document.querySelector("#adminHomePublicPages"),
  homeNavPages: document.querySelector("#adminHomeNavPages"),
  homeHiddenPages: document.querySelector("#adminHomeHiddenPages"),
  homeRegistryState: document.querySelector("#adminHomeRegistryState"),
  homeRegistryMeta: document.querySelector("#adminHomeRegistryMeta"),
  homePublishPages: document.querySelector("#adminHomePublishPages"),
  homePageStatus: document.querySelector("#adminHomePageStatus"),
  homePageList: document.querySelector("#adminHomePageList"),
  buildingPanel: document.querySelector("#adminBuildingPanel"),
  buildingReload: document.querySelector("#adminBuildingReload"),
  buildingStatus: document.querySelector("#adminBuildingStatus"),
  dormDeveloperLabels: document.querySelector("#adminDormDeveloperLabels"),
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
  heightDeveloperLabels: document.querySelector("#adminHeightDeveloperLabels"),
  heightForm: document.querySelector("#adminHeightForm"),
  heightSave: document.querySelector("#adminHeightForm button[type='submit']"),
  heightBuildingSelect: document.querySelector("#adminHeightBuildingSelect"),
  heightBuildingNumber: document.querySelector("#adminHeightBuildingNumber"),
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
  logRefresh: document.querySelector("#adminLogRefresh"),
  logStatus: document.querySelector("#adminLogStatus"),
  logList: document.querySelector("#adminLogList"),
  mapToolTitle: document.querySelector("#adminMapToolTitle"),
  mapToolStatus: document.querySelector("#adminMapToolStatus"),
  mapToolHint: document.querySelector("#adminMapToolHint"),
  mapToolDeveloperLabelBlock: document.querySelector("#adminMapToolDeveloperLabelBlock"),
  mapToolDeveloperLabels: document.querySelector("#adminMapToolDeveloperLabels"),
  mapToolInputBlock: document.querySelector("#adminMapToolInputBlock"),
  mapToolInputModes: [...document.querySelectorAll("[data-admin-input-mode]")],
  mapToolBoundaryControls: document.querySelector("#adminMapToolBoundaryControls"),
  mapToolBoundaryAreas: document.querySelector("#adminMapToolBoundaryAreas"),
  mapToolBoundaryLabels: document.querySelector("#adminMapToolBoundaryLabels"),
  mapToolBoundaryCopyAll: document.querySelector("#adminMapToolBoundaryCopyAll"),
  mapToolRoadControls: document.querySelector("#adminMapToolRoadControls"),
  mapToolRoadActions: [...document.querySelectorAll("[data-admin-road-action]")],
  mapToolCameraControls: document.querySelector("#adminMapToolCameraControls"),
  mapToolCameraGrid: document.querySelector("#adminMapToolCameraGrid"),
  mapToolCameraPitchModes: [...document.querySelectorAll("[data-admin-camera-pitch-mode]")],
  mapToolCameraPitch: document.querySelector("#adminMapToolCameraPitch"),
  mapToolCameraPitchValue: document.querySelector("#adminMapToolCameraPitchValue"),
  mapToolCameraHeight: document.querySelector("#adminMapToolCameraHeight"),
  mapToolCameraHeightValue: document.querySelector("#adminMapToolCameraHeightValue"),
  directorControls: document.querySelector("#adminDirectorControls"),
  directorShotName: document.querySelector("#adminDirectorShotName"),
  directorShotDuration: document.querySelector("#adminDirectorShotDuration"),
  directorRecord: document.querySelector("#adminDirectorRecord"),
  directorShotList: document.querySelector("#adminDirectorShotList"),
  mapToolOutput: document.querySelector("#adminMapToolOutput"),
  mapToolCopy: document.querySelector("#adminMapToolCopy"),
  mapToolDelete: document.querySelector("#adminMapToolDelete"),
  mapToolClear: document.querySelector("#adminMapToolClear"),
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
  operationLogs: [],
  mapReady: false,
  mapFrameMode: "normal",
  mapTool: null,
  directorShots: [],
  sitePages: [],
  sitePagesDirty: false,
  sitePagesSource: SITE_PAGES_CONFIG_PATH,
  sitePageProject: {
    projectName: "ANU Explore Project",
    publicUrl: "https://www.anuexplore.com"
  }
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

async function loadFunctionalBuildingConfig() {
  try {
    const response = await fetch(`${FUNCTIONAL_BUILDINGS_CONFIG_PATH}?v=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.warn("Functional building config could not be loaded:", error);
    return {};
  }
}

function isEditableDormConfig(config) {
  if (!config) return false;
  const displayMode = config.displayMode || config.mode;
  const buildingId = cleanText(config.buildingId);
  const isDorm =
    displayMode === "dorm" ||
    displayMode === "residence" ||
    config.type === "dorm" ||
    buildingId.startsWith("dorm_");
  return isDorm && config.showFunctionalLabel !== false && !config.groupPrimaryBuildingNumber;
}

function findDormDefaultForBuildingId(buildingId) {
  const id = cleanText(buildingId);
  const dormId = id.replace(/^dorm_/, "");
  return DORM_DEFAULTS.find(
    (dorm) => dorm?.buildingId === id || dorm?.mapFocus === id || dorm?.id === dormId
  ) || null;
}

function createStaticDormRow(buildingNumber, config) {
  const number = String(buildingNumber);
  const memberNumbers = Array.isArray(config.memberBuildingNumbers)
    ? [...new Set(config.memberBuildingNumbers.map(String).filter(Boolean))]
    : [number];
  const buildingNumbers = memberNumbers.includes(number)
    ? memberNumbers
    : [number, ...memberNumbers];
  const defaultDorm = findDormDefaultForBuildingId(config.buildingId);

  return {
    buildingNumber: number,
    buildingNumbers,
    buildingNumberLabel: buildingNumbers.length > 1 ? buildingNumbers.join(", ") : number,
    buildingId: cleanText(config.buildingId),
    displayMode: "dorm",
    type: "dorm",
    name: firstText(config.name, defaultDorm?.name),
    shortName: firstText(config.shortName, defaultDorm?.shortName),
    interactive: config.interactive !== false,
    labelEnabled: config.showFunctionalLabel !== false,
    dorm: {
      tag: firstText(defaultDorm?.tag),
      rentText: formatDefaultDormRent(defaultDorm),
      type: firstText(defaultDorm?.type, "Residential hall"),
      location: firstText(defaultDorm?.location, "ANU campus"),
      summary: firstText(defaultDorm?.summary, defaultDorm?.description),
      description: firstText(defaultDorm?.description, defaultDorm?.summary),
      bestFor: firstText(defaultDorm?.bestFor),
      locationFeel: firstText(defaultDorm?.locationFeel),
      tradeOff: firstText(defaultDorm?.tradeOff)
    },
    isStaticBaseline: true
  };
}

async function loadStaticDormRows() {
  const config = await loadFunctionalBuildingConfig();
  return Object.entries(config)
    .filter(([, item]) => isEditableDormConfig(item))
    .map(([buildingNumber, item]) => createStaticDormRow(buildingNumber, item));
}

function mergeDormRow(baseRow, databaseRow) {
  if (!baseRow) {
    return {
      ...databaseRow,
      buildingNumbers: [databaseRow.buildingNumber],
      buildingNumberLabel: databaseRow.buildingNumber
    };
  }

  return {
    ...baseRow,
    ...databaseRow,
    buildingNumbers: baseRow.buildingNumbers || [baseRow.buildingNumber],
    buildingNumberLabel: baseRow.buildingNumberLabel || databaseRow.buildingNumber,
    name: firstText(databaseRow.name, baseRow.name),
    shortName: firstText(databaseRow.shortName, baseRow.shortName),
    dorm: {
      tag: firstText(databaseRow.dorm?.tag, baseRow.dorm?.tag),
      rentText: firstText(databaseRow.dorm?.rentText, baseRow.dorm?.rentText),
      type: firstText(databaseRow.dorm?.type, baseRow.dorm?.type),
      location: firstText(databaseRow.dorm?.location, baseRow.dorm?.location),
      summary: firstText(databaseRow.dorm?.summary, baseRow.dorm?.summary),
      description: firstText(databaseRow.dorm?.description, baseRow.dorm?.description),
      bestFor: firstText(databaseRow.dorm?.bestFor, baseRow.dorm?.bestFor),
      locationFeel: firstText(databaseRow.dorm?.locationFeel, baseRow.dorm?.locationFeel),
      tradeOff: firstText(databaseRow.dorm?.tradeOff, baseRow.dorm?.tradeOff)
    },
    isStaticBaseline: baseRow.isStaticBaseline
  };
}

function sortDormRows(a, b) {
  const aNumber = Number(a.buildingNumber);
  const bNumber = Number(b.buildingNumber);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber;
  return String(a.buildingNumber).localeCompare(String(b.buildingNumber));
}

function mergeStaticAndDatabaseDormRows(staticRows, databaseRows) {
  const rowsByNumber = new Map();
  staticRows.forEach((row) => rowsByNumber.set(row.buildingNumber, row));

  databaseRows.forEach((row) => {
    if (!row.buildingNumber || row.displayMode !== "dorm") return;
    const baseRow = rowsByNumber.get(row.buildingNumber);
    rowsByNumber.set(row.buildingNumber, mergeDormRow(baseRow, row));
  });

  return [...rowsByNumber.values()]
    .filter((row) => row.buildingNumber && row.displayMode === "dorm")
    .sort(sortDormRows);
}

function setHidden(element, hidden) {
  if (element) element.hidden = hidden;
}

function getSavedAdminTheme() {
  try {
    return localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function setAdminTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.adminTheme = nextTheme;
  document.documentElement.dataset.adminTheme = nextTheme;
  try {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Local storage can be unavailable in strict browser modes; the page still works.
  }

  els.themeChoices.forEach((button) => {
    const isActive = button.dataset.adminThemeChoice === nextTheme;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", String(isActive));
  });
}

function isMapToolSection(section = state.activeSection) {
  return Object.prototype.hasOwnProperty.call(ADMIN_MAP_TOOL_SECTIONS, section);
}

function getMapToolConfig(section = state.activeSection) {
  return ADMIN_MAP_TOOL_SECTIONS[section] || ADMIN_MAP_TOOL_SECTIONS["tool-entrance"];
}

function isDirectorSection(section = state.activeSection) {
  return ADMIN_MAP_TOOL_SECTIONS[section]?.director === true;
}

function panelMatchesSection(panel, section) {
  return String(panel?.dataset?.adminPanel || "")
    .split(/\s+/)
    .filter(Boolean)
    .includes(section);
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

function getPublicSitePages() {
  return state.sitePages.filter((page) => page.status !== "hidden");
}

function getNavigationSitePages() {
  return state.sitePages.filter(
    (page) => page.status !== "hidden" && page.showInNavigation !== false
  );
}

function getHiddenSitePages() {
  return state.sitePages.filter(
    (page) => page.status === "hidden" || page.showInNavigation === false
  );
}

function escapeAdminHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setHomePageStatus(message, tone = "neutral") {
  if (!els.homePageStatus) return;
  els.homePageStatus.textContent = message;
  els.homePageStatus.dataset.tone = tone;
}

function normalizeSitePage(page, index = 0) {
  const status = page?.status === "hidden" ? "hidden" : "public";
  return {
    key: cleanText(page?.key) || `page-${index + 1}`,
    label: cleanText(page?.label) || cleanText(page?.key) || `Page ${index + 1}`,
    href: cleanText(page?.href) || "#",
    status,
    showInNavigation: status === "hidden" ? false : page?.showInNavigation !== false,
    role: cleanText(page?.role) || "page"
  };
}

function setSitePagesDirty(dirty, message = "") {
  state.sitePagesDirty = Boolean(dirty);
  if (els.homePublishPages) {
    els.homePublishPages.disabled = !state.sitePages.length || !state.sitePagesDirty;
    els.homePublishPages.textContent = state.sitePagesDirty ? "发布页面配置" : "页面配置已同步";
  }
  if (message) setHomePageStatus(message, dirty ? "warning" : "success");
}

function getSitePagesPublishPayload() {
  return {
    schema: "anu-explore-site-pages-draft-v1",
    projectName: state.sitePageProject.projectName || "ANU Explore Project",
    publicUrl: state.sitePageProject.publicUrl || "https://www.anuexplore.com",
    pages: state.sitePages.map(normalizeSitePage)
  };
}

function updateSitePageByKey(key, updater) {
  const index = state.sitePages.findIndex((page) => page.key === key);
  if (index < 0) return false;
  const nextPage = updater({ ...state.sitePages[index] }, index);
  state.sitePages[index] = normalizeSitePage(nextPage, index);
  setSitePagesDirty(true, "页面配置有未发布更改。点击“发布页面配置”后，官网菜单才会更新。");
  renderSitePagesOverview();
  return true;
}

function moveSitePage(key, direction) {
  const index = state.sitePages.findIndex((page) => page.key === key);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.sitePages.length) return false;
  const [page] = state.sitePages.splice(index, 1);
  state.sitePages.splice(nextIndex, 0, page);
  setSitePagesDirty(true, "页面顺序有未发布更改。点击“发布页面配置”后，官网菜单才会更新。");
  renderSitePagesOverview();
  return true;
}

function renderSitePagesOverview() {
  const publicPages = getPublicSitePages();
  const navPages = getNavigationSitePages();
  const hiddenPages = getHiddenSitePages();
  const projectName = state.sitePageProject.projectName || "ANU Explore Project";
  const publicUrl = state.sitePageProject.publicUrl || "https://www.anuexplore.com";

  if (els.homeProjectName) els.homeProjectName.textContent = projectName;
  if (els.homePublicUrl) els.homePublicUrl.textContent = publicUrl;
  if (els.homePublicPages) {
    els.homePublicPages.textContent = `${publicPages.length} independent pages`;
  }
  if (els.homeNavPages) {
    els.homeNavPages.textContent = `${navPages.length} shown`;
  }
  if (els.homeHiddenPages) {
    els.homeHiddenPages.textContent = `${hiddenPages.length} hidden`;
  }
  if (els.homeRegistryState) {
    els.homeRegistryState.textContent = state.sitePages.length ? "Ready" : "Missing";
  }
  if (els.homeRegistryMeta) {
    els.homeRegistryMeta.textContent = state.sitePages.length
      ? `${state.sitePages.length} registered, ${publicPages.length} public, ${hiddenPages.length} hidden · ${state.sitePagesSource}`
      : "page registry not loaded";
  }
  if (els.homePublishPages) {
    els.homePublishPages.disabled = !state.sitePages.length || !state.sitePagesDirty;
    els.homePublishPages.textContent = state.sitePagesDirty ? "发布页面配置" : "页面配置已同步";
  }

  if (!els.homePageList) return;
  els.homePageList.innerHTML = "";

  const pages = state.sitePages.length ? state.sitePages : [
    {
      key: "missing",
      label: "Page registry not loaded",
      href: SITE_PAGES_CONFIG_PATH,
      status: "warning",
      role: "config"
    }
  ];

  pages.forEach((page, index) => {
    const normalizedPage = normalizeSitePage(page, index);
    const row = document.createElement("article");
    row.className = "admin-home-page-row";
    row.dataset.status = normalizedPage.status;
    row.dataset.pageKey = normalizedPage.key;

    const statusText = normalizedPage.status === "hidden"
      ? "Hidden"
      : normalizedPage.showInNavigation === false
        ? "Unlisted"
        : "Public";
    const url = new URL(normalizedPage.href || "#", window.location.href);

    row.innerHTML = `
      <div class="admin-home-page-main">
        <strong>${escapeAdminHtml(normalizedPage.label)}</strong>
        <span>${escapeAdminHtml(normalizedPage.href || "-")}</span>
      </div>
      <small class="admin-home-page-role">${escapeAdminHtml(normalizedPage.role || "page")}</small>
      <button class="admin-home-page-status-button" type="button" data-site-page-action="toggle" data-page-key="${escapeAdminHtml(normalizedPage.key)}" aria-pressed="${normalizedPage.status !== "hidden"}" title="切换页面显示状态">
        ${statusText}
      </button>
      <div class="admin-home-page-order" aria-label="页面顺序">
        <button type="button" data-site-page-action="up" data-page-key="${escapeAdminHtml(normalizedPage.key)}" ${index === 0 ? "disabled" : ""} aria-label="上移 ${escapeAdminHtml(normalizedPage.label)}" title="上移">↑</button>
        <button type="button" data-site-page-action="down" data-page-key="${escapeAdminHtml(normalizedPage.key)}" ${index === pages.length - 1 ? "disabled" : ""} aria-label="下移 ${escapeAdminHtml(normalizedPage.label)}" title="下移">↓</button>
      </div>
      <a class="admin-home-page-open" href="${url.toString()}" target="_blank" rel="noreferrer">Open</a>
    `;
    els.homePageList.appendChild(row);
  });
}

async function loadSitePagesOverview() {
  const paths = [SITE_PAGES_PUBLISHED_CONFIG_PATH, SITE_PAGES_CONFIG_PATH];
  for (const path of paths) {
    try {
      const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.sitePagesSource = path;
      state.sitePageProject = {
        projectName: data.projectName || state.sitePageProject.projectName,
        publicUrl: data.publicUrl || state.sitePageProject.publicUrl
      };
      state.sitePages = Array.isArray(data.pages)
        ? data.pages.map((page, index) => normalizeSitePage(page, index))
        : [];
      state.sitePagesDirty = false;
      setHomePageStatus(
        path === SITE_PAGES_PUBLISHED_CONFIG_PATH
          ? "已载入官网发布版页面配置。"
          : "已载入本地默认页面配置；发布后官网会读取发布版配置。",
        "neutral"
      );
      renderSitePagesOverview();
      return;
    } catch (error) {
      console.warn(`Failed to load site pages overview from ${path}:`, error);
    }
  }

  try {
    const response = await fetch(SITE_PAGES_CONFIG_PATH, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.sitePageProject = {
      projectName: data.projectName || state.sitePageProject.projectName,
      publicUrl: data.publicUrl || state.sitePageProject.publicUrl
    };
    state.sitePages = Array.isArray(data.pages)
      ? data.pages.map((page, index) => normalizeSitePage(page, index))
      : [];
    state.sitePagesDirty = false;
  } catch (error) {
    console.warn("Failed to load site pages overview:", error);
    state.sitePages = [];
    state.sitePagesDirty = false;
  }
  renderSitePagesOverview();
}

function setLogStatus(message, tone = "neutral") {
  if (!els.logStatus) return;
  els.logStatus.textContent = message;
  els.logStatus.dataset.tone = tone;
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

function formatLogTime(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
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
  const signedIn = Boolean(state.session?.user);
  const hasAdminAccess = Boolean(state.adminProfile);
  const configStatus = getSupabaseConfigStatus();
  const email = state.session?.user?.email || "未登录";
  const name = signedIn && email.includes("@") ? email.split("@")[0] : "登录";
  const initial = (name || "A").slice(0, 1).toUpperCase();

  document.body.classList.toggle("is-admin-authenticated", hasAdminAccess);
  els.userName.textContent = name || "Admin";
  els.avatarInitial.textContent = initial;
  els.avatarButton?.classList.toggle("has-admin-image", hasAdminAccess);
  setHidden(els.avatarImage, !hasAdminAccess);
  if (els.accountName) els.accountName.textContent = name || "登录";
  els.accountEmail.textContent = email;
  els.accountRole.textContent = getAdminLevel();
  els.accountConnection.textContent = configStatus.ready ? "Supabase 正常" : "Supabase 未配置";
  els.accountStatus.textContent = !signedIn
    ? "需要登录后才能维护后台"
    : hasAdminAccess
      ? "管理员权限已启用"
      : "已登录，但未获得管理员权限";
  els.accountStatus.dataset.tone = !signedIn
    ? "neutral"
    : hasAdminAccess
      ? "success"
      : "warning";
  els.accountLogin.textContent = signedIn ? "切换账号" : "前往登录";
  setHidden(els.signOut, !signedIn);
}

function setAccountMenuOpen(open) {
  setHidden(els.accountMenu, !open);
  els.avatarButton?.setAttribute("aria-expanded", open ? "true" : "false");
}

function focusLoginPanel() {
  setAccountMenuOpen(false);
  setHidden(els.loginPanel, false);
  els.loginPanel?.scrollIntoView({ block: "start", behavior: "smooth" });
  window.setTimeout(() => els.email?.focus(), 120);
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
  updateAccountChrome();
  setStatus("Supabase config is incomplete.", "warning");
  return false;
}

function renderLoggedOut() {
  const pendingEmail = getPendingEmail();
  state.activeSection = "home";
  state.dormPreviewActive = false;
  state.heightPreviewActive = false;
  state.mapReady = false;
  document.body.dataset.adminSection = state.activeSection;
  els.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.adminSection === state.activeSection);
  });
  els.panels.forEach((panel) => {
    setHidden(panel, !panelMatchesSection(panel, state.activeSection));
  });
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
    setHidden(panel, !panelMatchesSection(panel, section));
  });

  if (section === "home") {
    if (els.previewTitle) els.previewTitle.textContent = "预览首页";
    ensureMapFrameMode("normal");
    return;
  } else if (section === "dorm") {
    if (els.previewTitle) els.previewTitle.textContent = "宿舍详情编辑";
  } else if (section === "logs") {
    if (els.previewTitle) els.previewTitle.textContent = "工程日志";
    ensureMapFrameMode("normal");
    loadOperationLogs();
    return;
  } else if (isMapToolSection(section)) {
    const config = getMapToolConfig(section);
    if (els.previewTitle) els.previewTitle.textContent = config.title;
    renderAdminMapToolShell();
    ensureMapFrameMode("map-tool", config.mode);
    return;
  } else {
    if (els.previewTitle) els.previewTitle.textContent = "建筑高度管理";
  }
  ensureMapFrameMode("normal");
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
  setFieldValue(els.buildingNumber, fallback.buildingNumberLabel || fallback.buildingNumber);
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
    option.textContent = `${row.name || row.shortName || row.buildingId} · ${
      row.buildingNumberLabel || row.buildingNumber
    }`;
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

function getMeaningfulBuildingName(item) {
  const number = cleanText(item?.buildingNumber);
  const genericName = `building ${number}`.trim();
  return [item?.name, item?.shortName]
    .map(cleanText)
    .find((name) => {
      const normalized = name.toLowerCase();
      return name && normalized !== number.toLowerCase() && normalized !== genericName && normalized !== "building";
    }) || "";
}

function createBuildingOption(item, emptyLabel = "不复制") {
  const option = document.createElement("option");
  option.value = item?.buildingNumber || "";
  if (!item) {
    option.textContent = emptyLabel;
    return option;
  }

  const name = getMeaningfulBuildingName(item);
  option.textContent = name ? `${item.buildingNumber} · ${name}` : String(item.buildingNumber || "");
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

  syncHeightBuildingInputs();
  renderHeightForm();
}

function syncHeightBuildingInputs() {
  if (els.heightBuildingSelect) els.heightBuildingSelect.value = state.selectedHeightNumber;
  if (els.heightBuildingNumber) els.heightBuildingNumber.value = state.selectedHeightNumber;
  if (els.heightTargets[0]) els.heightTargets[0].value = state.selectedHeightNumber;
}

function selectHeightBuilding(buildingNumber, options = {}) {
  const nextBuildingNumber = cleanText(buildingNumber);
  if (
    !nextBuildingNumber ||
    !state.heightCatalog.some((item) => item.buildingNumber === nextBuildingNumber)
  ) {
    return false;
  }

  state.selectedHeightNumber = nextBuildingNumber;
  syncHeightBuildingInputs();
  renderHeightForm({ preview: !!options.preview });
  return true;
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

function setAdminSwitch(button, enabled) {
  if (!button) return;
  const isActive = Boolean(enabled);
  button.classList.toggle("is-active", isActive);
  button.setAttribute("aria-pressed", String(isActive));
}

function setAdminChoice(buttons, activeValue, datasetKey) {
  buttons.forEach((button) => {
    const isActive = button.dataset[datasetKey] === activeValue;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setAdminRangeValue(input, value) {
  if (!input) return;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;

  const min = Number(input.min);
  const max = Number(input.max);
  if (Number.isFinite(min) && numericValue < min) {
    input.min = String(Math.floor(numericValue));
  }
  if (Number.isFinite(max) && numericValue > max) {
    input.max = String(Math.ceil(numericValue));
  }

  input.value = String(numericValue);
}

function getDeveloperLabelsButton(section = state.activeSection) {
  if (section === "dorm") return els.dormDeveloperLabels;
  if (section === "height") return els.heightDeveloperLabels;
  if (section === "tool-boundary") return null;
  if (isDirectorSection(section)) return null;
  if (isMapToolSection(section)) return els.mapToolDeveloperLabels;
  return null;
}

function getDeveloperLabelsEnabled(section = state.activeSection) {
  const button = getDeveloperLabelsButton(section);
  return button ? button.getAttribute("aria-pressed") === "true" : false;
}

function postDeveloperLabelsEnabled(section = state.activeSection) {
  const button = getDeveloperLabelsButton(section);
  if (!button) return;
  postMapMessage({
    type: "map-set-developer-labels",
    enabled: getDeveloperLabelsEnabled(section)
  });
}

function toggleDeveloperLabels(button) {
  const enabled = button.getAttribute("aria-pressed") !== "true";
  setAdminSwitch(button, enabled);
  postMapMessage({
    type: "map-set-developer-labels",
    enabled
  });
}

function getNormalMapPreviewUrl() {
  return new URL(`explore.html?adminPreview=overview&mode=guided&frame=${NORMAL_MAP_FRAME}`, window.location.href);
}

function getMapToolPreviewUrl(mode) {
  const url = new URL("explore.html", window.location.href);
  url.searchParams.set("adminPreview", "map-tool");
  url.searchParams.set("adminTool", "map-tools");
  url.searchParams.set("adminToolMode", mode || "entrance");
  url.searchParams.set("frame", ADMIN_MAP_TOOL_FRAME);
  return url;
}

function sameFrameUrl(nextUrl) {
  if (!els.mapFrame?.src) return false;
  const currentUrl = new URL(els.mapFrame.src, window.location.href);
  if (
    currentUrl.searchParams.get("adminTool") === "map-tools" &&
    nextUrl.searchParams.get("adminTool") === "map-tools" &&
    currentUrl.searchParams.get("frame") === nextUrl.searchParams.get("frame")
  ) {
    return true;
  }

  return currentUrl.pathname === nextUrl.pathname &&
    currentUrl.searchParams.get("adminTool") === nextUrl.searchParams.get("adminTool") &&
    currentUrl.searchParams.get("adminToolMode") === nextUrl.searchParams.get("adminToolMode") &&
    currentUrl.searchParams.get("frame") === nextUrl.searchParams.get("frame");
}

function setMapFrameUrl(nextUrl, mode) {
  if (!els.mapFrame) return;
  if (sameFrameUrl(nextUrl)) {
    state.mapFrameMode = mode;
    return;
  }

  state.mapReady = false;
  state.mapFrameMode = mode;
  state.mapTool = null;
  if (els.previewStatus) els.previewStatus.textContent = "正在载入地图...";
  els.mapFrame.src = nextUrl.toString();
}

function ensureMapFrameMode(mode, toolMode = "") {
  if (!els.mapFrame) return;

  if (mode === "map-tool") {
    setMapFrameUrl(getMapToolPreviewUrl(toolMode), "map-tool");
    if (state.mapReady) sendAdminMapToolMode();
    return;
  }

  setMapFrameUrl(getNormalMapPreviewUrl(), "normal");
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
  if (!state.mapReady || isMapToolSection()) return;
  postMapMessage({
    type: "overview-preview",
    mode: state.activeSection
  });
  postDeveloperLabelsEnabled(state.activeSection);
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
  postDeveloperLabelsEnabled("dorm");
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
  postDeveloperLabelsEnabled("height");
}

function sendAdminMapToolMode() {
  if (!state.mapReady || !isMapToolSection()) return;
  const config = getMapToolConfig();
  postMapMessage({
    type: "map-tool-set-mode",
    mode: config.mode
  });
  postDeveloperLabelsEnabled(state.activeSection);
}

function renderAdminMapToolShell() {
  const config = getMapToolConfig();
  if (els.mapToolTitle) els.mapToolTitle.textContent = config.title;
  if (els.mapToolHint) els.mapToolHint.textContent = config.hint;
  if (isDirectorSection() && els.directorShotName && !cleanText(els.directorShotName.value)) {
    els.directorShotName.value = `镜头 ${state.directorShots.length + 1}`;
  }
  const usesDeveloperLabels = config.mode !== "boundary" && !isDirectorSection();
  setHidden(els.mapToolDeveloperLabelBlock, !usesDeveloperLabels);
  if (!usesDeveloperLabels) setAdminSwitch(els.mapToolDeveloperLabels, false);
  renderAdminMapToolState(state.mapTool?.mode === config.mode ? state.mapTool : null);
}

function setAdminMapToolStatus(message, tone = "neutral") {
  if (!els.mapToolStatus) return;
  els.mapToolStatus.textContent = message;
  els.mapToolStatus.dataset.tone = tone;
}

function getAdminMapToolOutputText(payload = state.mapTool) {
  if (!payload?.output) return "";
  return JSON.stringify(payload.output, null, 2);
}

function renderBoundaryRows(areas = [], activeArea = 1) {
  if (!els.mapToolBoundaryAreas) return;
  els.mapToolBoundaryAreas.replaceChildren();

  areas.forEach((area) => {
    const row = document.createElement("div");
    row.className = "admin-map-tool-boundary-row";
    row.classList.toggle("is-active", Number(area.index) === Number(activeArea));

    const select = document.createElement("button");
    select.type = "button";
    select.textContent = area.closed
      ? `${area.label} 已闭合`
      : `${area.label} (${area.totalPoints || 0})`;
    select.addEventListener("click", () => {
      postMapMessage({
        type: "map-tool-boundary-area",
        areaIndex: Number(area.index) - 1
      });
    });

    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "复制";
    copy.disabled = !area.totalPoints;
    copy.addEventListener("click", () => copyAdminText(JSON.stringify(area, null, 2), "已复制当前面积。"));

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "删除";
    del.disabled = !area.totalPoints;
    del.addEventListener("click", () => {
      postMapMessage({
        type: "map-tool-delete-boundary-area",
        areaIndex: Number(area.index) - 1
      });
    });

    row.append(select, copy, del);
    els.mapToolBoundaryAreas.appendChild(row);
  });
}

function cloneAdminData(value) {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function getDirectorOutput() {
  return {
    tool: "director-camera-script",
    mode: "camera-keyframes-v1",
    totalShots: state.directorShots.length,
    shots: state.directorShots
  };
}

function getDirectorOutputText() {
  return JSON.stringify(getDirectorOutput(), null, 2);
}

function getDirectorDraftName() {
  return cleanText(els.directorShotName?.value) || `镜头 ${state.directorShots.length + 1}`;
}

function renderDirectorShotList() {
  if (!els.directorShotList) return;
  els.directorShotList.replaceChildren();

  if (!state.directorShots.length) {
    const empty = document.createElement("li");
    empty.className = "admin-director-shot-empty";
    empty.textContent = "还没有记录镜头。";
    els.directorShotList.appendChild(empty);
    return;
  }

  state.directorShots.forEach((shot) => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const meta = document.createElement("span");

    title.textContent = `${shot.index}. ${shot.label}`;
    meta.textContent = `${shot.durationSeconds}s · 高度 ${Math.round(shot.cameraView?.height || 0)} · 俯仰 ${Math.round(shot.cameraView?.pitchDegrees || 0)}°`;

    item.append(title, meta);
    els.directorShotList.appendChild(item);
  });
}

function recordDirectorShot() {
  const cameraView = state.mapTool?.output;
  if (!cameraView || cameraView.tool !== "camera-view") {
    setAdminMapToolStatus("右侧地图视角尚未就绪，请先点击地图或稍等载入。", "warning");
    return;
  }

  const index = state.directorShots.length + 1;
  const durationValue = Number(els.directorShotDuration?.value);
  const durationSeconds = Number.isFinite(durationValue)
    ? Math.max(0.5, Math.min(30, durationValue))
    : 4;
  const label = getDirectorDraftName();

  state.directorShots.push({
    index,
    label,
    durationSeconds,
    cameraView: cloneAdminData(cameraView),
    recordedAt: new Date().toISOString()
  });

  if (els.directorShotName) {
    els.directorShotName.value = `镜头 ${state.directorShots.length + 1}`;
  }
  if (els.directorShotDuration) {
    els.directorShotDuration.value = String(durationSeconds);
  }

  renderAdminMapToolState(state.mapTool);
  setAdminMapToolStatus(`已记录 ${label}。`, "success");
}

function deleteLastDirectorShot() {
  if (!state.directorShots.length) return;
  const removed = state.directorShots.pop();
  state.directorShots = state.directorShots.map((shot, index) => ({
    ...shot,
    index: index + 1
  }));
  renderAdminMapToolState(state.mapTool);
  setAdminMapToolStatus(`已删除 ${removed.label}。`, "success");
}

function clearDirectorShots() {
  if (!state.directorShots.length) return;
  state.directorShots = [];
  if (els.directorShotName) els.directorShotName.value = "镜头 1";
  renderAdminMapToolState(state.mapTool);
  setAdminMapToolStatus("已清空导演镜头。", "success");
}

function renderAdminMapToolState(payload) {
  const config = getMapToolConfig();
  const mode = payload?.mode || config.mode;
  const isBoundary = mode === "boundary";
  const isRoad = mode === "road";
  const isCamera = mode === "camera";
  const isDirector = isDirectorSection();
  const outputText = isDirector ? getDirectorOutputText() : getAdminMapToolOutputText(payload);
  const hasOutput = isDirector ? state.directorShots.length > 0 : Boolean(outputText);
  const inputMode = isBoundary
    ? payload?.boundaryMode || "mouse"
    : isRoad
      ? payload?.roadMode || "mouse"
      : payload?.entranceMode || "mouse";

  setHidden(els.mapToolInputBlock, isCamera);
  setHidden(els.mapToolBoundaryControls, !isBoundary);
  setHidden(els.mapToolRoadControls, !isRoad);
  setHidden(els.mapToolCameraControls, !isCamera);
  setHidden(els.directorControls, !isDirector);

  els.mapToolInputModes.forEach((button) => {
    const isActive = button.dataset.adminInputMode === inputMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (els.mapToolOutput) {
    els.mapToolOutput.textContent = outputText || "等待地图工具载入...";
  }

  if (els.mapToolCopy) {
    els.mapToolCopy.disabled = !hasOutput;
    els.mapToolCopy.textContent = isBoundary
      ? "复制当前"
      : isRoad
        ? "复制道路"
        : isDirector
          ? "复制镜头脚本"
          : isCamera
          ? "复制视角"
          : "复制 JSON";
  }

  if (els.mapToolDelete) {
    els.mapToolDelete.disabled = isDirector ? !state.directorShots.length : isCamera || !payload?.canDelete;
    els.mapToolDelete.textContent = isDirector
      ? "删除上一镜头"
      : isBoundary
      ? "删除上一点"
      : isRoad && payload?.roadAction === "remove"
        ? "撤销删段"
        : "删除上一个";
  }

  if (els.mapToolClear) {
    els.mapToolClear.disabled = isDirector ? !state.directorShots.length : isCamera ? false : !payload?.canClear;
    els.mapToolClear.textContent = isDirector ? "清空镜头" : isCamera ? "重置视角" : "清空";
  }

  if (els.mapToolBoundaryLabels) {
    els.mapToolBoundaryLabels.textContent = payload?.boundaryLabelsEnabled
      ? "建筑编号：开"
      : "建筑编号：关";
    els.mapToolBoundaryLabels.classList.toggle("is-active", !!payload?.boundaryLabelsEnabled);
  }

  if (els.mapToolBoundaryCopyAll) {
    els.mapToolBoundaryCopyAll.disabled = !payload?.boundaryTotalPoints;
  }

  if (els.mapToolDeveloperLabels && !isBoundary) {
    setAdminSwitch(els.mapToolDeveloperLabels, !!payload?.developerLabelsEnabled);
  }

  els.mapToolRoadActions.forEach((button) => {
    const isActive = button.dataset.adminRoadAction === (payload?.roadAction || "add");
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (isBoundary) {
    renderBoundaryRows(payload?.boundaryAreas || [], payload?.activeArea || 1);
  }

  if (isCamera) {
    if (els.mapToolCameraGrid) {
      setAdminSwitch(els.mapToolCameraGrid, !!payload?.camera?.gridEnabled);
    }
    const pitchMode = payload?.camera?.pitchMode === "focus" ? "focus" : "camera";
    const pitchDegrees = Number(payload?.camera?.pitchDegrees ?? 48);
    const cameraHeight = Number(payload?.camera?.height ?? 980);
    setAdminChoice(els.mapToolCameraPitchModes, pitchMode, "adminCameraPitchMode");
    setAdminRangeValue(els.mapToolCameraPitch, pitchDegrees);
    if (els.mapToolCameraPitchValue) {
      els.mapToolCameraPitchValue.textContent = `${Math.round(pitchDegrees)}°`;
    }
    setAdminRangeValue(els.mapToolCameraHeight, cameraHeight);
    if (els.mapToolCameraHeightValue) {
      els.mapToolCameraHeightValue.textContent = String(Math.round(cameraHeight));
    }
  }

  if (isDirector) {
    renderDirectorShotList();
    setAdminMapToolStatus(
      payload
        ? `视角可记录，已记录 ${state.directorShots.length} 个镜头。`
        : "等待右侧地图载入导演视角...",
      payload ? "success" : "neutral"
    );
    return;
  }

  setAdminMapToolStatus(payload?.status || "等待右侧地图工具载入...", payload ? "success" : "neutral");
}

async function copyAdminText(text, successMessage = "已复制。") {
  if (!text) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
    setAdminMapToolStatus(successMessage, "success");
  } catch (error) {
    console.warn("Admin clipboard copy failed:", error);
    setAdminMapToolStatus("复制被浏览器拦截，请手动选择复制板内容。", "warning");
  }
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

  const staticRows = await loadStaticDormRows();
  const { data, error } = await state.client
    .from(BUILDING_LABEL_OVERRIDES_TABLE)
    .select(BUILDING_LABEL_OVERRIDE_COLUMNS)
    .order("building_number", { ascending: true });

  if (error) {
    setBuildingStatus(`Could not load building labels: ${error.message}`, "error");
    state.buildingRows = staticRows;
    return;
  }

  const databaseRows = (data || [])
    .map(normalizeBuildingOverrideRow)
    .filter((row) => row.buildingNumber && row.displayMode === "dorm");
  state.buildingRows = mergeStaticAndDatabaseDormRows(staticRows, databaseRows);
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

function renderOperationLogs() {
  if (!els.logList) return;
  els.logList.replaceChildren();

  if (!state.operationLogs.length) {
    const empty = document.createElement("p");
    empty.className = "admin-log-empty";
    empty.textContent = "暂无数据库操作记录。";
    els.logList.appendChild(empty);
    return;
  }

  state.operationLogs.forEach((log) => {
    const item = document.createElement("article");
    item.className = "admin-log-item";

    const head = document.createElement("div");
    head.className = "admin-log-item__head";

    const title = document.createElement("strong");
    title.textContent = log.summary || log.action || "数据库操作";

    const time = document.createElement("time");
    time.dateTime = log.created_at || "";
    time.textContent = formatLogTime(log.created_at);

    head.append(title, time);

    const meta = document.createElement("p");
    meta.className = "admin-log-item__meta";
    meta.textContent = [
      log.actor_email || "unknown user",
      log.permission_level || "Clevel",
      log.status || "success",
      log.target_table || "database",
      [log.entity_type, log.entity_id].filter(Boolean).join(": ")
    ].filter(Boolean).join(" / ");

    const details = document.createElement("details");
    details.className = "admin-log-item__details";
    const summary = document.createElement("summary");
    summary.textContent = "查看详情";
    const code = document.createElement("pre");
    code.textContent = JSON.stringify(log.details || {}, null, 2);
    details.append(summary, code);

    item.append(head, meta, details);
    els.logList.appendChild(item);
  });
}

async function loadOperationLogs() {
  state.operationLogs = [];
  if (!state.client || !state.adminProfile) return;
  setLogStatus("正在读取工程日志...", "neutral");

  const { data, error } = await state.client
    .from(ADMIN_OPERATION_LOG_TABLE)
    .select(ADMIN_OPERATION_LOG_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.warn("Admin operation logs unavailable:", error);
    setLogStatus(
      `工程日志表还不可用：请先运行 supabase/patch-admin-operation-logs.sql。${error.message}`,
      "warning"
    );
    renderOperationLogs();
    return;
  }

  state.operationLogs = data || [];
  setLogStatus(`已读取 ${state.operationLogs.length} 条数据库操作记录。`, "success");
  renderOperationLogs();
}

async function logAdminOperation({
  action,
  entityType,
  entityId = "",
  targetTable = "",
  summary,
  details = {},
  status = "success"
}) {
  if (!state.client || !state.session || !state.adminProfile) return;

  const payload = {
    actor_user_id: state.session.user.id,
    actor_email: state.session.user.email || "unknown",
    permission_level: getAdminLevel(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    target_table: targetTable,
    status,
    summary,
    details
  };

  const { error } = await state.client.from(ADMIN_OPERATION_LOG_TABLE).insert(payload);
  if (error) {
    console.warn("Admin operation log failed:", error);
    if (state.activeSection === "logs") {
      setLogStatus(
        `工程日志写入失败：请确认已运行 supabase/patch-admin-operation-logs.sql。${error.message}`,
        "warning"
      );
    }
    return;
  }

  if (state.activeSection === "logs") {
    await loadOperationLogs();
  }
}

async function queuePublicPagePublish(scope, details, statusTarget = "global") {
  const { data, error } = await enqueuePublicPagePublishRequest(state.client, scope, {
    ...details,
    allowedScopes: PUBLIC_PAGE_PUBLISH_ALLOWED_SCOPES
  });

  if (error) {
    const message =
      `官网发布请求失败：请确认已运行 supabase/patch-public-page-publish-requests.sql。${error.message}`;
    if (statusTarget === "building") setBuildingStatus(message, "error");
    else if (statusTarget === "height") setHeightStatus(message, "error");
    else setStatus(message, "error");
    return null;
  }

  return data;
}

async function invokePublicPagePublish(requestRow, statusTarget = "global") {
  if (!requestRow?.id) return { ok: false, skipped: true };

  const { data, error } = await invokePublicPagePublishRequest(state.client, requestRow.id);
  if (error) {
    const message = `官网发布请求已记录，但发布函数暂不可用：${error.message}`;
    if (statusTarget === "building") setBuildingStatus(message, "warning");
    else if (statusTarget === "height") setHeightStatus(message, "warning");
    else setStatus(message, "warning");

    await logAdminOperation({
      action: "invoke_public_pages_publish_failed",
      entityType: "public_pages_publish",
      entityId: requestRow.id,
      targetTable: PUBLIC_PAGE_PUBLISH_REQUESTS_TABLE,
      status: "failed",
      summary: "触发官网发布函数失败",
      details: {
        requestId: requestRow.id,
        error: error.message,
        response: data || null
      }
    });

    return { ok: false, error };
  }

  return { ok: true, data };
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
  setAccountMenuOpen(false);
  renderLoggedOut();
}

async function handleAccountLogin() {
  if (state.session && state.client) {
    await handleSignOut();
  } else {
    renderLoggedOut();
  }
  focusLoginPanel();
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
  await logAdminOperation({
    action: "save_dorm_detail",
    entityType: "dorm",
    entityId: payload.building_number,
    targetTable: BUILDING_LABEL_OVERRIDES_TABLE,
    summary: `保存宿舍详情：${values.name || values.buildingNumber}`,
    details: {
      buildingNumber: values.buildingNumber,
      name: values.name,
      changes
    }
  });
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
  await logAdminOperation({
    action: "rollback_dorm_detail",
    entityType: "dorm",
    entityId: buildingNumber,
    targetTable: BUILDING_LABEL_OVERRIDES_TABLE,
    summary: `回退宿舍详情：${els.displayName.value || buildingNumber}`,
    details: {
      buildingNumber,
      restoredFrom: data.created_at || null,
      historyAction: data.action || null
    }
  });
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
    await logAdminOperation({
      action: mode === "publish" ? "publish_building_height" : "save_building_height_draft",
      entityType: "building_height",
      entityId: targets.join(","),
      targetTable: BUILDING_HEIGHT_OVERRIDES_TABLE,
      summary: mode === "publish"
        ? `手动发布建筑高度：${targets.join(", ")}`
        : `保存建筑高度草稿：${targets.join(", ")}`,
      details: {
        mode,
        targets,
        multiplier: Number(els.heightMultiplier.value) || 1,
        copyFromBuildingNumber: cleanText(els.heightCopyFrom.value)
      }
    });
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
    await logAdminOperation({
      action: "publish_all_building_height_drafts",
      entityType: "building_height",
      entityId: labels,
      targetTable: BUILDING_HEIGHT_OVERRIDES_TABLE,
      summary: `统一发布 ${payloads.length} 个高度草稿`,
      details: {
        buildingNumbers: draftRows.map((row) => row.buildingNumber),
        total: payloads.length
      }
    });
    const request = await queuePublicPagePublish(
      PUBLIC_PAGE_PUBLISH_SCOPES.BUILDING_HEIGHTS,
      {
        source: "admin_building_height_manager",
        buildingNumbers: draftRows.map((row) => row.buildingNumber),
        total: payloads.length
      },
      "height"
    );
    if (!request) return;

    await logAdminOperation({
      action: "queue_building_height_public_publish",
      entityType: "public_pages_publish",
      entityId: request.id,
      targetTable: PUBLIC_PAGE_PUBLISH_REQUESTS_TABLE,
      status: "queued",
      summary: `创建建筑高度官网发布请求：${payloads.length} 个建筑`,
      details: {
        requestId: request.id,
        publishScope: PUBLIC_PAGE_PUBLISH_SCOPES.BUILDING_HEIGHTS,
        buildingNumbers: draftRows.map((row) => row.buildingNumber),
        allowedScopes: PUBLIC_PAGE_PUBLISH_ALLOWED_SCOPES
      }
    });

    const invokeResult = await invokePublicPagePublish(request, "height");
    if (!invokeResult.ok) return;

    setHeightStatus(
      `已统一发布 ${payloads.length} 个高度草稿，并触发官网发布请求 ${request.id}。`,
      "success"
    );
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
    await logAdminOperation({
      action: "rollback_building_height",
      entityType: "building_height",
      entityId: buildingNumber,
      targetTable: BUILDING_HEIGHT_OVERRIDES_TABLE,
      summary: `回退建筑高度：${buildingNumber}`,
      details: {
        buildingNumber,
        restoredFrom: data.created_at || null,
        historyAction: data.action || null
      }
    });
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

async function handlePublishDorm() {
  if (!state.client || !state.session || !state.adminProfile) return;
  const selectedRow = getSelectedBuildingRow();
  const buildingNumber = selectedRow?.buildingNumber || cleanText(els.buildingNumber?.value);
  const dormName = cleanText(els.displayName?.value) || selectedRow?.name || buildingNumber || "宿舍详情";

  if (!window.confirm(`确认创建宿舍详情官网发布请求？\n\n范围：只导出宿舍详情文字和标签，不会修改入口、道路、圈地或建筑几何。`)) {
    setBuildingStatus("已取消官网发布请求。", "neutral");
    return;
  }

  setButtonBusy(els.publishDorm, true, "请求中...");
  setBuildingStatus("正在创建宿舍详情官网发布请求...", "neutral");

  try {
    const request = await queuePublicPagePublish(
      PUBLIC_PAGE_PUBLISH_SCOPES.DORM_DETAILS,
      {
        source: "admin_dorm_detail_editor",
        buildingNumber,
        dormName
      },
      "building"
    );

    if (!request) return;

    await logAdminOperation({
      action: "queue_dorm_detail_public_publish",
      entityType: "public_pages_publish",
      entityId: request.id,
      targetTable: PUBLIC_PAGE_PUBLISH_REQUESTS_TABLE,
      status: "queued",
      summary: `创建宿舍详情官网发布请求：${dormName}`,
      details: {
        requestId: request.id,
        publishScope: PUBLIC_PAGE_PUBLISH_SCOPES.DORM_DETAILS,
        buildingNumber,
        allowedScopes: PUBLIC_PAGE_PUBLISH_ALLOWED_SCOPES
      }
    });

    const invokeResult = await invokePublicPagePublish(request, "building");
    if (!invokeResult.ok) return;

    setBuildingStatus(
      `已创建并触发官网发布请求 ${request.id}。第一版只允许同步宿舍详情文字和标签。`,
      "success"
    );
  } finally {
    setButtonBusy(els.publishDorm, false);
  }
}

function handleSitePageListClick(event) {
  const button = event.target.closest("[data-site-page-action]");
  if (!button || !els.homePageList?.contains(button)) return;

  const key = button.dataset.pageKey;
  const action = button.dataset.sitePageAction;
  if (!key || !action) return;

  if (action === "toggle") {
    updateSitePageByKey(key, (page) => {
      const hidden = page.status === "hidden" || page.showInNavigation === false;
      return {
        ...page,
        status: hidden ? "public" : "hidden",
        showInNavigation: hidden
      };
    });
    return;
  }

  if (action === "up" || action === "down") {
    moveSitePage(key, action);
  }
}

async function handlePublishSitePages() {
  if (!state.client || !state.session || !state.adminProfile) return;
  if (!state.sitePages.length) {
    setHomePageStatus("页面配置没有载入，无法发布。", "error");
    return;
  }

  const payload = getSitePagesPublishPayload();
  const hiddenLabels = payload.pages
    .filter((page) => page.status === "hidden" || page.showInNavigation === false)
    .map((page) => page.label);
  const publicLabels = payload.pages
    .filter((page) => page.status !== "hidden" && page.showInNavigation !== false)
    .map((page) => page.label);

  if (!window.confirm(
    `确认发布页面配置？\n\n公开页面：${publicLabels.join("、") || "无"}\n隐藏页面：${hiddenLabels.join("、") || "无"}`
  )) {
    setHomePageStatus("已取消页面配置发布。", "neutral");
    return;
  }

  setButtonBusy(els.homePublishPages, true, "发布中...");
  setHomePageStatus("正在创建页面配置官网发布请求...", "neutral");

  try {
    const request = await queuePublicPagePublish(
      PUBLIC_PAGE_PUBLISH_SCOPES.SITE_PAGES,
      {
        source: "admin_site_pages_overview",
        sitePages: payload.pages,
        projectName: payload.projectName,
        publicUrl: payload.publicUrl,
        publicPageKeys: payload.pages
          .filter((page) => page.status !== "hidden" && page.showInNavigation !== false)
          .map((page) => page.key),
        hiddenPageKeys: payload.pages
          .filter((page) => page.status === "hidden" || page.showInNavigation === false)
          .map((page) => page.key)
      },
      "global"
    );

    if (!request) return;

    await logAdminOperation({
      action: "queue_site_pages_public_publish",
      entityType: "public_pages_publish",
      entityId: request.id,
      targetTable: PUBLIC_PAGE_PUBLISH_REQUESTS_TABLE,
      status: "queued",
      summary: `创建页面配置官网发布请求：${publicLabels.length} 个公开，${hiddenLabels.length} 个隐藏`,
      details: {
        requestId: request.id,
        publishScope: PUBLIC_PAGE_PUBLISH_SCOPES.SITE_PAGES,
        pages: payload.pages,
        allowedScopes: PUBLIC_PAGE_PUBLISH_ALLOWED_SCOPES
      }
    });

    const invokeResult = await invokePublicPagePublish(request, "global");
    if (!invokeResult.ok) return;

    state.sitePagesDirty = false;
    state.sitePagesSource = SITE_PAGES_PUBLISHED_CONFIG_PATH;
    renderSitePagesOverview();
    setHomePageStatus(
      `已发布页面配置 ${request.id}。官网刷新后会按当前顺序和隐藏状态显示菜单。`,
      "success"
    );
  } finally {
    setButtonBusy(els.homePublishPages, false);
    renderSitePagesOverview();
  }
}

function handleMapMessage(event) {
  if (event.origin !== window.location.origin) return;
  const message = event.data || {};
  if (message.source !== "anu-explore-preview") return;

  if (message.type === "ready") {
    state.mapReady = true;
    els.previewStatus.textContent = "Map ready";
    setHeightCatalog(message.buildings || []);
    if (isMapToolSection()) {
      sendAdminMapToolMode();
    } else if (state.activeSection === "dorm" && state.dormPreviewActive) {
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
      selectHeightBuilding(buildingNumber, { preview: true });
    }
    return;
  }

  if (message.type === "map-tool-state") {
    state.mapTool = message.payload || null;
    renderAdminMapToolState(state.mapTool);
  }
}

function requestMapBuildings() {
  postMapMessage({ type: "get-buildings" });
}

els.avatarButton?.addEventListener("click", () => {
  setAccountMenuOpen(els.accountMenu.hidden);
});
document.addEventListener("click", (event) => {
  if (els.accountMenu?.hidden) return;
  if (els.avatarButton?.contains(event.target) || els.accountMenu?.contains(event.target)) return;
  setAccountMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setAccountMenuOpen(false);
});
els.passwordForm?.addEventListener("submit", handlePasswordLogin);
els.loginForm?.addEventListener("submit", handleLogin);
els.otpForm?.addEventListener("submit", handleVerifyOtp);
els.accountLogin?.addEventListener("click", handleAccountLogin);
els.signOut?.addEventListener("click", handleSignOut);
els.themeChoices.forEach((button) => {
  button.addEventListener("click", () => {
    setAdminTheme(button.dataset.adminThemeChoice);
  });
});
els.homeCopyUrl?.addEventListener("click", async () => {
  const url = state.sitePageProject.publicUrl || els.homePublicUrl?.textContent || "";
  if (!url) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(url);
    setStatus("官网链接已复制", "success");
  } catch (error) {
    console.warn("Homepage URL copy failed:", error);
    setStatus("复制被浏览器拦截，请手动选择官网链接。", "warning");
  }
});
els.homePageList?.addEventListener("click", handleSitePageListClick);
els.homePublishPages?.addEventListener("click", handlePublishSitePages);
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
els.logRefresh?.addEventListener("click", loadOperationLogs);
els.mapToolInputModes.forEach((button) => {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.adminInputMode;
    const currentMode = button.getAttribute("aria-pressed") === "true" ? nextMode : null;
    if (currentMode) return;
    postMapMessage({ type: "map-tool-toggle-input" });
  });
});
els.mapToolRoadActions.forEach((button) => {
  button.addEventListener("click", () => {
    postMapMessage({
      type: "map-tool-road-action",
      action: button.dataset.adminRoadAction
    });
  });
});
els.mapToolBoundaryLabels?.addEventListener("click", () => {
  postMapMessage({ type: "map-tool-toggle-boundary-labels" });
});
els.mapToolBoundaryCopyAll?.addEventListener("click", () => {
  const areas = state.mapTool?.output?.areas || [];
  const filledAreas = areas.filter((area) => area.totalPoints > 0);
  copyAdminText(JSON.stringify(filledAreas, null, 2), "已复制全部圈地面积。");
});
[els.dormDeveloperLabels, els.heightDeveloperLabels, els.mapToolDeveloperLabels].forEach((button) => {
  button?.addEventListener("click", () => toggleDeveloperLabels(button));
});
els.mapToolCameraGrid?.addEventListener("click", () => {
  const enabled = els.mapToolCameraGrid.getAttribute("aria-pressed") !== "true";
  setAdminSwitch(els.mapToolCameraGrid, enabled);
  postMapMessage({
    type: "map-tool-camera-grid",
    enabled
  });
});
els.mapToolCameraPitchModes.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.adminCameraPitchMode === "focus" ? "focus" : "camera";
    setAdminChoice(els.mapToolCameraPitchModes, mode, "adminCameraPitchMode");
    postMapMessage({
      type: "map-tool-camera-pitch-mode",
      mode
    });
  });
});
els.mapToolCameraPitch?.addEventListener("input", () => {
  postMapMessage({
    type: "map-tool-camera-pitch",
    value: els.mapToolCameraPitch.value
  });
});
els.mapToolCameraHeight?.addEventListener("input", () => {
  postMapMessage({
    type: "map-tool-camera-height",
    value: els.mapToolCameraHeight.value
  });
});
els.directorRecord?.addEventListener("click", recordDirectorShot);
els.mapToolCopy?.addEventListener("click", () => {
  copyAdminText(
    isDirectorSection() ? getDirectorOutputText() : getAdminMapToolOutputText(),
    isDirectorSection() ? "已复制导演镜头脚本。" : "已复制地图工具 JSON。"
  );
});
els.mapToolDelete?.addEventListener("click", () => {
  if (isDirectorSection()) {
    deleteLastDirectorShot();
    return;
  }
  postMapMessage({ type: "map-tool-delete-last" });
});
els.mapToolClear?.addEventListener("click", () => {
  if (isDirectorSection()) {
    clearDirectorShots();
    return;
  }
  postMapMessage({ type: "map-tool-clear" });
});
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
  selectHeightBuilding(els.heightBuildingSelect.value, { preview: true });
});
els.heightBuildingNumber?.addEventListener("input", () => {
  selectHeightBuilding(els.heightBuildingNumber.value, { preview: true });
});
els.heightBuildingNumber?.addEventListener("change", () => {
  const buildingNumber = cleanText(els.heightBuildingNumber.value);
  if (!buildingNumber) {
    syncHeightBuildingInputs();
    return;
  }
  if (!selectHeightBuilding(buildingNumber, { preview: true })) {
    setHeightStatus(`没有找到 ${buildingNumber} 号建筑。`, "warning");
  }
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

setAdminTheme(getSavedAdminTheme());
renderConfig();
loadSitePagesOverview();
refreshAdminState();
