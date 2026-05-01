/* =========================================================
   HOME PAGE — TAG DRIVEN ENTRY
   清理后单一版本：
   1) Hero 按钮滚动
   2) Explore by Path 三个一级面板：
      - Major（单选，含 Math）
      - Lifestyle（多选 + 已选排序）
      - Requirements（自由选择，无顺序）
   3) 一级面板横向拖动排序
   4) Lifestyle 已选标签可拖动排序
   5) 初始状态：
      - Continue 蓝色可用（默认已满足）
      - Reset 灰色不可用
   6) 点 Continue 后：
      - 结果区刷新为 ranked dorms
      - Continue 变白不可用
      - Reset 变蓝可用
   7) Continue 后若再改标签：
      - Continue 重新变蓝可用
      - Reset 保持蓝色可用
   8) Reset 恢复默认标签与默认结果
   9) 宿舍图片恢复
   10) Compare 区继续保留可用
   11) 卡片按钮统一为 have a look，沿用 Explore guided 入口
   ========================================================= */

(function initHomePage() {
  const body = document.body;
  if (!body || body.dataset.page !== "home") return;

  const pathResult = document.querySelector("#path-result");
  const heroSection = document.querySelector(".hero-home");
  const startExploringBtn = document.querySelector(".primary-button");
  const compareHeroBtn = document.querySelector(".secondary-button");

  const homePath = document.querySelector("#homePath");
  const homeResults = document.querySelector("#homeResults");
  const compareSection = document.querySelector("#compare");

  const panelRail = document.querySelector("#pathPanelRail");
  const majorOptions = document.querySelector("#majorOptions");
  const habitOptions = document.querySelector("#habitOptions");
  const habitSelected = document.querySelector("#habitSelected");
  const requirementOptions = document.querySelector("#requirementOptions");

  const continueBtn = document.querySelector("#pathContinueBtn");
  const resetBtn = document.querySelector("#pathResetBtn");

  const resultsHead = document.querySelector(".home-results__head");
  const rankedDormGrid = document.querySelector("#rankedDormGrid");
  const selectedDormSummary = document.querySelector("#selectedDormSummary");

  const compareModeText = document.querySelector("#compare-mode-text");
  const compareBody = document.querySelector("#compare-body");
  const compareModeButtons = document.querySelectorAll(".compare-mode-button");

  if (
    !pathResult ||
    !heroSection ||
    !homePath ||
    !homeResults ||
    !compareSection ||
    !panelRail ||
    !majorOptions ||
    !habitOptions ||
    !habitSelected ||
    !requirementOptions ||
    !continueBtn ||
    !resetBtn ||
    !resultsHead ||
    !rankedDormGrid ||
    !selectedDormSummary ||
    !compareModeText ||
    !compareBody
  ) {
    console.error("Home page DOM is incomplete for tag-driven entry.");
    return;
  }

  const PANEL_META = window.PATH_OPTIONS;

  if (!PANEL_META || !PANEL_META.major || !PANEL_META.habit || !PANEL_META.requirement) {
    console.error("PATH_OPTIONS is missing or incomplete. Check that src/data/path-options.js is loaded before script.js.");
  }

  const ALL_DORMS = Array.isArray(window.DORM_DATA) ? window.DORM_DATA : [];
  const DORMS = ALL_DORMS.filter((dorm) => dorm.isHomeCandidate !== false);

  if (!DORMS.length) {
    console.error("Dorm data is missing. Check that src/data/dorms.js is loaded before script.js.");
  }

  const DEFAULT_STATE = {
    panelOrder: ["major", "habit", "requirement"],
    major: "business",
    habits: [],
    requirements: [],
    compareMode: "default"
  };

  let homeStage = "hero";
  let curtainProgress = 0;
  let isLeavingForExplore = false;

  body.classList.add("home-paged");
  body.style.setProperty("--home-curtain-progress", "0");

  function setCurtainProgress(value) {
    curtainProgress = Math.max(0, Math.min(value, 1));
    body.style.setProperty("--home-curtain-progress", curtainProgress.toFixed(3));
  }

  function setHomeStage(stage) {
    homeStage = stage;
    body.classList.toggle("home-stage-hero", stage === "hero");
    body.classList.toggle("home-stage-path", stage === "path");
    body.classList.toggle("home-stage-results", stage === "results");

    if (stage !== "hero") {
      setCurtainProgress(1);
    }

    if (stage !== "results") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }

  function showResultsPage(target = homeResults) {
    setHomeStage("results");
    window.requestAnimationFrame(() => {
      renderResultsSection();
      target.scrollIntoView({
        behavior: "auto",
        block: "start"
      });
    });
  }

  function transitionToExplorePage() {
    if (isLeavingForExplore) return;

    isLeavingForExplore = true;
    body.classList.add("home-transition-to-explore");
    window.setTimeout(() => {
      window.location.href = "explore.html?from=homePath";
    }, 560);
  }

  function handleHeroCurtainWheel(event) {
    if (homeStage !== "hero" || isLeavingForExplore) return;

    event.preventDefault();
    if (event.deltaY <= 0) return;

    const step = Math.min(Math.abs(event.deltaY), 180) / 720;
    setCurtainProgress(curtainProgress + step);

    if (curtainProgress >= 1) {
      setHomeStage("path");
    }
  }

  const state = JSON.parse(JSON.stringify(DEFAULT_STATE));

  let appliedSnapshot = null;
  let draggingHabitId = null;
  let pointerPanelDrag = null;
  let rankedSliderStep = 0;

  // =====================================================
  // Utility helpers
  // 工具函数：只处理复制、数组比较等通用逻辑
  // =====================================================

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function arraysEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =====================================================
  // Dorm lookup and page navigation
  // 宿舍查找与页面跳转逻辑
  // =====================================================

  function getDormById(id) {
    return DORMS.find((item) => item.id === id);
  }

  function getLabelFromOptions(options, id) {
    const match = options.find((item) => item.id === id);
    return match ? match.label : id;
  }

  function openDormMap(dorm) {
    if (!dorm) return;

    if (dorm.mapFocus) {
      window.location.href =
        `explore.html?mode=guided&focus=${encodeURIComponent(dorm.mapFocus)}&from=ranked`;
      return;
    }

    window.location.href = "explore.html?mode=guided&from=ranked";
  }

  function openDormInformation(dorm) {
    if (!dorm) return;
    window.location.href = `information.html?dorm=${encodeURIComponent(dorm.id)}&mode=full`;
  }

  const dormCardComponent = window.DormCardComponent;

  if (!dormCardComponent || typeof dormCardComponent.createDormCard !== "function") {
    console.error("DormCardComponent is missing. Check that src/components/DormCard.js is loaded before script.js.");
  }

  // =====================================================
  // Selection state helpers
  // 选择状态判断：用于判断按钮、重置、流程状态
  // =====================================================

  function isSelectionValid() {
    return Boolean(state.major) && state.habits.length > 0;
  }

  function hasAppliedSelection() {
    return Boolean(appliedSnapshot);
  }

  function hasUnappliedChanges() {
    if (!appliedSnapshot) return false;

    return !(
      arraysEqual(state.panelOrder, appliedSnapshot.panelOrder) &&
      state.major === appliedSnapshot.major &&
      arraysEqual(state.habits, appliedSnapshot.habits) &&
      arraysEqual(state.requirements, appliedSnapshot.requirements)
    );
  }

  function hasChangedFromDefault() {
    return !(
      arraysEqual(state.panelOrder, DEFAULT_STATE.panelOrder) &&
      state.major === DEFAULT_STATE.major &&
      arraysEqual(state.habits, DEFAULT_STATE.habits) &&
      arraysEqual(state.requirements, DEFAULT_STATE.requirements)
    );
  }

  // =====================================================
  // General UI state updates
  // 通用界面状态更新：hero 文案、面板序号、按钮状态
  // =====================================================

  function updateHeroStatusText() {
    const majorLabel = getLabelFromOptions(PANEL_META.major.options, state.major);
    const topPanel = state.panelOrder[0];
    const habitPreview = state.habits.length
      ? state.habits.map((id) => getLabelFromOptions(PANEL_META.habit.options, id)).join(" → ")
      : "None";
    const requirementPreview = state.requirements.length
      ? state.requirements.map((id) => getLabelFromOptions(PANEL_META.requirement.options, id)).join(", ")
      : "None";

    if (!hasAppliedSelection()) {
      pathResult.textContent =
        `Top panel: ${topPanel}. Major: ${majorLabel}. Lifestyle order: ${habitPreview}. Requirements: ${requirementPreview}.`;
      return;
    }

    if (hasUnappliedChanges()) {
      pathResult.textContent =
        "Selections changed. Continue to refresh ranking, or Reset to return to the previously applied setup.";
      return;
    }

    pathResult.textContent =
      "Dorm ranking updated from your current tag path. Reset is now available if you want to restore the default setup.";
  }

  function updatePanelRankBadges() {
    state.panelOrder.forEach((panelId, index) => {
      const badge = document.querySelector(`[data-rank-for="${panelId}"]`);
      if (badge) badge.textContent = String(index + 1);
    });
  }

  function updateActionButtons() {
    const valid = isSelectionValid();
    const applied = hasAppliedSelection();
    const changed = hasUnappliedChanges();
    const changedFromDefault = hasChangedFromDefault();

    continueBtn.classList.remove(
      "path-action-button--primary",
      "path-action-button--secondary",
      "path-action-button--ghost"
    );
    resetBtn.classList.remove(
      "path-action-button--primary",
      "path-action-button--secondary",
      "path-action-button--ghost",
      "path-action-button--reset-active"
    );

    if (!applied) {
      continueBtn.disabled = !valid;
      resetBtn.disabled = !changedFromDefault;

      continueBtn.classList.add(valid ? "path-action-button--primary" : "path-action-button--ghost");
      resetBtn.classList.add(changedFromDefault ? "path-action-button--reset-active" : "path-action-button--ghost");
      return;
    }

    if (applied && changed) {
      continueBtn.disabled = !valid;
      resetBtn.disabled = false;

      continueBtn.classList.add(valid ? "path-action-button--primary" : "path-action-button--ghost");
      resetBtn.classList.add("path-action-button--reset-active");
      return;
    }

    continueBtn.disabled = true;
    resetBtn.disabled = false;

    continueBtn.classList.add("path-action-button--ghost");
    resetBtn.classList.add("path-action-button--reset-active");
  }

  function reorderPanelsDOM() {
    const panels = [...panelRail.querySelectorAll(".priority-card")];
    const panelMap = new Map(panels.map((panel) => [panel.dataset.panel, panel]));

    state.panelOrder.forEach((panelId) => {
      const panel = panelMap.get(panelId);
      if (panel) panelRail.appendChild(panel);
    });

    updatePanelRankBadges();
  }

  // =====================================================
  // Drag interactions
  // 拖拽交互：一级面板排序与 lifestyle 已选标签排序
  // =====================================================

  function getPanelFromPoint(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    return target ? target.closest(".priority-card") : null;
  }

  function clearPanelDragClasses() {
    panelRail.querySelectorAll(".priority-card").forEach((item) => {
      item.classList.remove("is-dragging", "drag-over");
    });
  }

  function finishPanelPointerDrag(event) {
    if (!pointerPanelDrag) return;

    const { active, panelId } = pointerPanelDrag;
    const targetPanel = active ? getPanelFromPoint(event) : null;
    const targetId = targetPanel ? targetPanel.dataset.panel : null;

    pointerPanelDrag = null;
    clearPanelDragClasses();

    if (!active || !targetId || panelId === targetId) return;

    const next = [...state.panelOrder];
    const fromIndex = next.indexOf(panelId);
    const toIndex = next.indexOf(targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, panelId);

    state.panelOrder = next;
    onSelectionChanged();
  }

  function bindPanelDrag() {
    if (panelRail.dataset.panelPointerBound !== "true") {
      panelRail.dataset.panelPointerBound = "true";

      document.addEventListener("pointermove", (event) => {
        if (!pointerPanelDrag) return;

        const distanceX = Math.abs(event.clientX - pointerPanelDrag.startX);
        const distanceY = Math.abs(event.clientY - pointerPanelDrag.startY);

        if (!pointerPanelDrag.active && distanceX + distanceY < 8) return;
        if (!pointerPanelDrag.active && distanceY > distanceX) return;

        event.preventDefault();
        pointerPanelDrag.active = true;
        pointerPanelDrag.panel.classList.add("is-dragging");

        panelRail.querySelectorAll(".priority-card").forEach((item) => {
          item.classList.remove("drag-over");
        });

        const targetPanel = getPanelFromPoint(event);
        if (targetPanel && targetPanel.dataset.panel !== pointerPanelDrag.panelId) {
          targetPanel.classList.add("drag-over");
        }
      });

      document.addEventListener("pointerup", finishPanelPointerDrag);
      document.addEventListener("pointercancel", finishPanelPointerDrag);
    }

    panelRail.querySelectorAll(".priority-card").forEach((panel) => {
      if (panel.dataset.panelDragBound === "true") return;
      panel.dataset.panelDragBound = "true";
      panel.draggable = false;

      panel.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        if (event.target.closest(".choice-pill, .selected-order-pill, button, a")) return;

        pointerPanelDrag = {
          active: false,
          panel,
          panelId: panel.dataset.panel,
          startX: event.clientX,
          startY: event.clientY
        };
      });
    });
  }

  // =====================================================
  // Preference panel rendering
  // 偏好选择面板渲染：Major / Lifestyle / Requirements
  // =====================================================

  function renderMajorOptions() {
    majorOptions.innerHTML = PANEL_META.major.options
      .map((option) => {
        const activeClass = state.major === option.id ? " is-selected" : "";
        return `
          <button class="choice-pill${activeClass}" type="button" data-major="${option.id}">
            ${option.label}
          </button>
        `;
      })
      .join("");

    majorOptions.querySelectorAll("[data-major]").forEach((button) => {
      button.addEventListener("click", () => {
        state.major = button.dataset.major;
        onSelectionChanged();
      });
    });
  }

  function renderHabitSelected() {
    habitSelected.innerHTML = "";

    if (!state.habits.length) {
      habitSelected.innerHTML = `<div class="sort-chip is-empty">No selection yet</div>`;
      return;
    }

    state.habits.forEach((habitId, index) => {
      const option = PANEL_META.habit.options.find((item) => item.id === habitId);
      if (!option) return;

      const item = document.createElement("div");
      item.className = "selected-order-pill";
      item.draggable = true;
      item.dataset.habitId = habitId;

      item.innerHTML = `
        <span class="selected-order-pill__drag">⋮</span>
        <span class="selected-order-pill__index">${index + 1}</span>
        <span class="selected-order-pill__text">${option.label}</span>
        <button type="button" class="selected-order-pill__remove" aria-label="Remove ${option.label}">×</button>
      `;

      item.addEventListener("dragstart", (event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", habitId);
        draggingHabitId = habitId;
        item.classList.add("is-dragging");
      });

      item.addEventListener("dragend", (event) => {
        event.stopPropagation();
        draggingHabitId = null;
        item.classList.remove("is-dragging");
        habitSelected.querySelectorAll(".selected-order-pill").forEach((node) => {
          node.classList.remove("drag-over");
        });
      });

      item.addEventListener("dragover", (event) => {
        event.stopPropagation();
        event.preventDefault();
      });

      item.addEventListener("dragenter", (event) => {
        event.stopPropagation();
        if (draggingHabitId && draggingHabitId !== habitId) {
          item.classList.add("drag-over");
        }
      });

      item.addEventListener("dragleave", (event) => {
        event.stopPropagation();
        item.classList.remove("drag-over");
      });

      item.addEventListener("drop", (event) => {
        event.stopPropagation();
        event.preventDefault();

        if (!draggingHabitId || draggingHabitId === habitId) return;

        const fromIndex = state.habits.indexOf(draggingHabitId);
        const toIndex = state.habits.indexOf(habitId);

        if (fromIndex === -1 || toIndex === -1) return;

        const next = [...state.habits];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, draggingHabitId);

        state.habits = next;
        onSelectionChanged();
      });

      item.querySelector(".selected-order-pill__remove").addEventListener("click", () => {
        state.habits = state.habits.filter((id) => id !== habitId);
        onSelectionChanged();
      });

      habitSelected.appendChild(item);
    });
  }

  function renderHabitOptions() {
    habitOptions.innerHTML = PANEL_META.habit.options
      .filter((option) => !state.habits.includes(option.id))
      .map((option) => {
        return `
          <button class="choice-pill" type="button" data-habit="${option.id}">
            ${option.label}
          </button>
        `;
      })
      .join("");

    habitOptions.querySelectorAll("[data-habit]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.habit;
        if (state.habits.includes(id)) return;

        state.habits = [...state.habits, id];
        onSelectionChanged();
      });
    });
  }

  function renderRequirementOptions() {
    requirementOptions.innerHTML = PANEL_META.requirement.options
      .map((option) => {
        const activeClass = state.requirements.includes(option.id) ? " is-selected" : "";
        return `
          <button class="choice-pill${activeClass}" type="button" data-requirement="${option.id}">
            ${option.label}
          </button>
        `;
      })
      .join("");

    requirementOptions.querySelectorAll("[data-requirement]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.requirement;

        if (state.requirements.includes(id)) {
          state.requirements = state.requirements.filter((item) => item !== id);
        } else {
          state.requirements = [...state.requirements, id];
        }

        onSelectionChanged();
      });
    });
  }

  // =====================================================
  // Dorm ranking and recommendation flow
  // 宿舍排序与推荐流程：当前仍是 placeholder algorithm
  // =====================================================

  function rankDormsByPlaceholderAlgorithm() {
    let firstDormId = "wright";

    if (state.major === "business") {
      firstDormId = "lena";
    } else if (state.major === "computing" || state.major === "math") {
      firstDormId = "warrumbul";
    } else if (
      state.major === "psychology" ||
      state.major === "environment" ||
      state.major === "mechanical"
    ) {
      firstDormId = "wright";
    }

    const firstDorm = getDormById(firstDormId);
    const remaining = DORMS
      .filter((dorm) => dorm.id !== firstDormId)
      .sort((a, b) => a.name.localeCompare(b.name));

    return [firstDorm, ...remaining];
  }

  const dormSummaryComponent = window.DormSummaryComponent;
  const dormListComponent = window.DormListComponent;

  if (!dormSummaryComponent || typeof dormSummaryComponent.createSummaryMarkup !== "function") {
    console.error("DormSummaryComponent is missing. Check that src/components/DormSummary.js is loaded before script.js.");
  }

  if (!dormListComponent || typeof dormListComponent.createDormListMarkup !== "function") {
    console.error("DormListComponent is missing. Check that src/components/DormList.js is loaded before script.js.");
  }

  // =====================================================
  // Selected dorm summary rendering
  // 选中宿舍摘要渲染：HTML 由 DormSummaryComponent 生成
  // =====================================================

  let activeSummaryKey = "";
  let summaryAnimationToken = 0;

  function getSummaryKey(dorm) {
    if (!dorm) return "empty";
    if (dorm.id) return `dorm:${dorm.id}`;
    return `placeholder:${dorm.name || "coming-soon"}`;
  }

  function createSummaryPanel(markup, extraClass = "") {
    const panel = document.createElement("div");
    panel.className = `selected-summary-card__panel${extraClass ? ` ${extraClass}` : ""}`;
    panel.innerHTML = markup;
    return panel;
  }

  function renderSummary(dorm, options = {}) {
    selectedDormSummary.className = "selected-summary-card";

    if (!dormSummaryComponent || typeof dormSummaryComponent.createSummaryMarkup !== "function") {
      selectedDormSummary.innerHTML = "";
      return;
    }

    const nextKey = getSummaryKey(dorm);
    const nextMarkup = dormSummaryComponent.createSummaryMarkup(dorm);
    const direction = Math.sign(options.direction || 0);
    const viewport = selectedDormSummary.querySelector(".selected-summary-card__viewport");
    const activePanel = viewport?.querySelector(".selected-summary-card__panel.is-active");
    const shouldAnimate = Boolean(viewport && activePanel && activeSummaryKey && activeSummaryKey !== nextKey && direction);

    activeSummaryKey = nextKey;
    selectedDormSummary.dataset.summaryKey = nextKey;

    if (!shouldAnimate) {
      selectedDormSummary.innerHTML = `
        <div class="selected-summary-card__viewport">
          <div class="selected-summary-card__panel is-active">
            ${nextMarkup}
          </div>
        </div>
      `;
      bindCardActions(selectedDormSummary);
      return;
    }

    const token = summaryAnimationToken + 1;
    summaryAnimationToken = token;
    const enterClass = direction > 0 ? "selected-summary-card__panel--from-right" : "selected-summary-card__panel--from-left";
    const exitClass = direction > 0 ? "selected-summary-card__panel--to-left" : "selected-summary-card__panel--to-right";
    const nextPanel = createSummaryPanel(nextMarkup, enterClass);
    const startHeight = activePanel.offsetHeight;

    viewport.style.height = `${startHeight}px`;
    viewport.appendChild(nextPanel);

    const endHeight = nextPanel.offsetHeight;
    viewport.style.height = `${Math.max(startHeight, endHeight)}px`;

    requestAnimationFrame(() => {
      activePanel.classList.remove("is-active");
      activePanel.classList.add(exitClass);
      nextPanel.classList.remove(enterClass);
      nextPanel.classList.add("is-active");
      viewport.style.height = `${endHeight}px`;
    });

    window.setTimeout(() => {
      if (summaryAnimationToken !== token) return;

      nextPanel.className = "selected-summary-card__panel is-active";
      viewport.innerHTML = "";
      viewport.appendChild(nextPanel);
      viewport.style.height = "";
      bindCardActions(nextPanel);
    }, 360);
  }

  function renderSummaryForCarouselItem(item, options = {}) {
    const dormId = item ? item.dataset.summaryDormId : "";
    const dorm = dormId ? getDormById(dormId) : null;

    if (dorm) {
      renderSummary(dorm, options);
      return;
    }

    renderSummary({
      name: item && item.dataset.summaryPlaceholder ? item.dataset.summaryPlaceholder : "Coming soon",
      bestFor: "Future residence updates.",
      locationFeel: "To be added.",
      tradeOff: "Details are not connected yet.",
      summary: "Reserved for future residence updates."
    }, options);
  }

  // =====================================================
  // Dorm card actions and list rendering
  // 宿舍卡片事件与列表渲染：HTML 由 DormCard / DormList 生成
  // =====================================================

  function bindCardActions(container) {
    container.querySelectorAll("[data-map]").forEach((button) => {
      button.addEventListener("click", () => {
        const dorm = getDormById(button.dataset.map);
        if (!dorm) return;
        renderSummary(dorm);
        openDormMap(dorm);
      });
    });

    container.querySelectorAll("[data-information]").forEach((button) => {
      button.addEventListener("click", () => {
        const dorm = getDormById(button.dataset.information);
        if (!dorm) return;
        renderSummary(dorm);
        openDormInformation(dorm);
      });
    });
  }

  function createDormCard(dorm, rankLabel = null) {
    if (!dormCardComponent || typeof dormCardComponent.createDormCard !== "function") {
      return "";
    }

    return dormCardComponent.createDormCard(dorm, rankLabel);
  }

  function createPlaceholderDormCard(index, rankLabel = null) {
    const rankBadge = rankLabel
      ? `<span class="ranked-dorm-card__rank">${escapeHtml(rankLabel)}</span>`
      : "";

    return `
      <article class="ranked-dorm-card ranked-dorm-card--placeholder" aria-label="Placeholder dorm ${index + 1}">
        <div class="ranked-dorm-card__image">${rankBadge}</div>
        <div class="ranked-dorm-card__body">
          <p class="ranked-dorm-card__eyebrow">Placeholder</p>
          <h3 class="ranked-dorm-card__title">Coming soon</h3>
          <p class="ranked-dorm-card__text">Reserved for future residence updates.</p>
          <div class="ranked-dorm-card__actions" aria-hidden="true">
            <span class="ranked-dorm-card__button-placeholder">have a look</span>
          </div>
        </div>
      </article>
    `;
  }

  function initFeaturedDormCarousel() {
    const track = rankedDormGrid.querySelector(".featured-dorm-carousel__track");
    if (!track) return;

    const previousButton = rankedDormGrid.querySelector("[data-featured-previous]");
    const nextButton = rankedDormGrid.querySelector("[data-featured-next]");
    const realItems = [...track.querySelectorAll("[data-carousel-real='true']")];
    const items = [...track.children];
    if (!realItems.length || !items.length) return;

    let itemOffsets = [];
    let currentIndex = realItems.length;
    let currentTranslate = 0;
    let isPointerDown = false;
    let hasDragged = false;
    let suppressNextClick = false;
    let clickSuppressTimer = null;
    let wheelSettleTimer = null;
    let startX = 0;
    let startTranslate = 0;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let dragVelocity = 0;

    function syncOffsets() {
      itemOffsets = items.map((item) => item.offsetLeft);
    }

    function setTranslate(value, animate = false) {
      currentTranslate = value;
      track.classList.toggle("is-animating", animate);
      track.style.transform = `translate3d(${value}px, 0, 0)`;
    }

    function moveTo(index, animate = true) {
      const safeIndex = Math.max(0, Math.min(index, itemOffsets.length - 1));
      const previousIndex = currentIndex;
      const direction = safeIndex === previousIndex ? 0 : safeIndex > previousIndex ? 1 : -1;
      currentIndex = safeIndex;
      setTranslate(-(itemOffsets[currentIndex] || 0), animate);
      renderSummaryForCarouselItem(items[currentIndex], { direction: animate ? direction : 0 });
    }

    function findNearestIndexFromTranslate(value = currentTranslate) {
      const targetLeft = -value;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      itemOffsets.forEach((offset, index) => {
        const distance = Math.abs(offset - targetLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      return nearestIndex;
    }

    function settleToNearest(projectedTranslate = currentTranslate) {
      if (!itemOffsets.length) return;
      moveTo(findNearestIndexFromTranslate(projectedTranslate), true);
    }

    function normalizeLoop() {
      const total = items.length;
      const realCount = realItems.length;
      let normalizedIndex = currentIndex;

      if (currentIndex < realCount) {
        normalizedIndex += realCount;
      } else if (currentIndex >= total - realCount) {
        normalizedIndex -= realCount;
      }

      if (normalizedIndex !== currentIndex) {
        moveTo(normalizedIndex, false);
      }
    }

    function settleAfterWheel() {
      if (isPointerDown) return;
      settleToNearest();
    }

    function stepFeatured(direction) {
      window.clearTimeout(wheelSettleTimer);
      track.classList.remove("is-dragging");
      moveTo(currentIndex + direction, true);
    }

    function handlePointerEnd(event) {
      if (!isPointerDown) return;
      isPointerDown = false;
      if (event && typeof event.pointerId === "number" && track.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
      track.classList.remove("is-dragging");
      if (!hasDragged) return;
      window.clearTimeout(clickSuppressTimer);
      suppressNextClick = true;
      clickSuppressTimer = window.setTimeout(() => {
        suppressNextClick = false;
      }, 250);
      settleToNearest(currentTranslate + dragVelocity * 260);
    }

    syncOffsets();
    moveTo(currentIndex, false);

    track.addEventListener("transitionend", (event) => {
      if (event.target !== track || event.propertyName !== "transform") return;
      track.classList.remove("is-animating");
      normalizeLoop();
    });

    track.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, a")) return;
      isPointerDown = true;
      hasDragged = false;
      window.clearTimeout(wheelSettleTimer);
      startX = event.clientX;
      startTranslate = currentTranslate;
      lastPointerX = event.clientX;
      lastPointerTime = performance.now();
      dragVelocity = 0;
      track.classList.remove("is-animating");
      track.setPointerCapture(event.pointerId);
      track.classList.add("is-dragging");
    });

    track.addEventListener("pointermove", (event) => {
      if (!isPointerDown) return;
      const deltaX = event.clientX - startX;
      if (Math.abs(deltaX) > 6) hasDragged = true;
      setTranslate(startTranslate + deltaX, false);

      const now = performance.now();
      const elapsed = Math.max(now - lastPointerTime, 1);
      dragVelocity = (event.clientX - lastPointerX) / elapsed;
      lastPointerX = event.clientX;
      lastPointerTime = now;
    });

    track.addEventListener("pointerup", handlePointerEnd);
    track.addEventListener("pointercancel", handlePointerEnd);
    track.addEventListener("pointerleave", handlePointerEnd);
    track.addEventListener(
      "wheel",
      (event) => {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        event.preventDefault();
        window.clearTimeout(wheelSettleTimer);
        track.classList.remove("is-animating");
        setTranslate(currentTranslate - event.deltaX * 1.45, false);
        wheelSettleTimer = window.setTimeout(settleAfterWheel, 90);
      },
      { passive: false },
    );
    track.addEventListener(
      "click",
      (event) => {
        if (!suppressNextClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
      },
      true,
    );

    if (previousButton) {
      previousButton.addEventListener("click", () => {
        stepFeatured(-1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        stepFeatured(1);
      });
    }

    window.addEventListener("resize", () => {
      syncOffsets();
      moveTo(currentIndex, false);
    });
  }

  function renderFeaturedDormCards() {
    resultsHead.innerHTML = `
      <p class="eyebrow">FEATURED DORMS</p>
      <h2>Featured dorms</h2>
      <p class="home-results__intro">
        Browse the current dorm options after the map handoff. Your tag path stays available above whenever you want to reset and adjust it.
      </p>
    `;

    const featuredCards = DORMS.map((dorm) => ({
      markup: createDormCard(dorm),
      dormId: dorm.id
    }));
    const placeholderCards = [0, 1, 2].map((index) => createPlaceholderDormCard(index));
    const cardPool = [
      ...featuredCards,
      ...placeholderCards.map((markup) => ({ markup, dormId: "" }))
    ];
    const createCardItems = (isReal) =>
      cardPool
        .map(
          (card) => `
            <div class="featured-dorm-carousel__item" data-carousel-real="${isReal ? "true" : "false"}" data-summary-dorm-id="${escapeHtml(card.dormId)}" data-summary-placeholder="${card.dormId ? "" : "Coming soon"}">
              ${card.markup}
            </div>
          `
        )
        .join("");

    rankedDormGrid.className = "featured-dorm-carousel";
    rankedDormGrid.innerHTML = `
      <button class="featured-dorm-carousel__cue featured-dorm-carousel__cue--left" type="button" data-featured-previous aria-label="Previous featured dorm">‹</button>
      <button class="featured-dorm-carousel__cue featured-dorm-carousel__cue--right" type="button" data-featured-next aria-label="Next featured dorm">›</button>
      <div class="featured-dorm-carousel__track">
        ${createCardItems(false)}
        ${createCardItems(true)}
        ${createCardItems(false)}
      </div>
    `;
    bindCardActions(rankedDormGrid);
    initFeaturedDormCarousel();
  }

  function renderRankedDormCards(rankedDorms) {
    resultsHead.innerHTML = `
      <p class="eyebrow">MATCHED RESULTS</p>
      <h2>Your ranked dorms</h2>
      <p class="home-results__intro">
        The current placeholder algorithm uses major as the only live ranking rule. Lifestyle and requirements are already captured in the interface and left ready for later scoring expansion.
      </p>
    `;

    const rankedCards = rankedDorms.map((dorm, index) => ({
      markup: createDormCard(dorm, `#${index + 1}`),
      dormId: dorm.id
    }));
    const placeholderCards = [3, 4, 5].map((index) => ({
      markup: createPlaceholderDormCard(index, `#${index + 1}`),
      dormId: ""
    }));
    const rankedCardsAll = [...rankedCards, ...placeholderCards];

    rankedDormGrid.className = "ranked-dorm-carousel";
    rankedDormGrid.innerHTML = `
      <div class="ranked-dorm-carousel__controls">
        <button type="button" class="ranked-dorm-carousel__control" data-ranked-next ${rankedSliderStep >= rankedCardsAll.length - 1 ? "disabled" : ""}>Next</button>
      </div>
      <div class="ranked-dorm-carousel__track">
        ${rankedCardsAll
          .map(
            (card, index) => `
              <div class="ranked-dorm-carousel__item" data-ranked-step="${index}" data-summary-dorm-id="${escapeHtml(card.dormId)}" data-summary-placeholder="${card.dormId ? "" : "Coming soon"}">
                ${card.markup}
              </div>
            `
          )
          .join("")}
      </div>
    `;

    const rankedTrack = rankedDormGrid.querySelector(".ranked-dorm-carousel__track");
    const rankedItems = [...rankedDormGrid.querySelectorAll(".ranked-dorm-carousel__item")];
    const nextBtn = rankedDormGrid.querySelector("[data-ranked-next]");
    let itemOffsets = [];
    let isPointerDown = false;
    let hasDragged = false;
    let isProgrammaticScroll = false;
    let rankedSettleTimer = null;
    let startX = 0;
    let startScroll = 0;

    function syncRankedOffsets() {
      itemOffsets = rankedItems.map((item) => item.offsetLeft);
    }

    function getMaxRankedStep() {
      if (!rankedTrack || !rankedItems.length) return 0;

      const firstItem = rankedItems[0];
      const itemWidth = firstItem ? firstItem.offsetWidth : rankedTrack.clientWidth;
      const gap = 22;
      const visibleCount = Math.max(1, Math.floor((rankedTrack.clientWidth + gap) / (itemWidth + gap)));

      return Math.max(0, rankedItems.length - visibleCount);
    }

    function scrollToStep(step, behavior = "smooth") {
      if (!rankedTrack || !rankedItems.length) return;
      const previousStep = rankedSliderStep;
      rankedSliderStep = Math.max(0, Math.min(step, getMaxRankedStep()));
      const direction = rankedSliderStep === previousStep ? 0 : rankedSliderStep > previousStep ? 1 : -1;
      const target = rankedItems[rankedSliderStep];
      isProgrammaticScroll = true;
      rankedTrack.scrollTo({ left: target.offsetLeft, behavior });
      renderSummaryForCarouselItem(target, { direction: behavior === "auto" ? 0 : direction });
      if (nextBtn) nextBtn.disabled = rankedSliderStep >= getMaxRankedStep();
      window.setTimeout(() => {
        isProgrammaticScroll = false;
      }, behavior === "auto" ? 0 : 280);
    }

    function findNearestStep() {
      if (!itemOffsets.length || !rankedTrack) return rankedSliderStep;

      const currentLeft = rankedTrack.scrollLeft;
      let nearestStep = rankedSliderStep;
      let nearestDistance = Number.POSITIVE_INFINITY;

      itemOffsets.forEach((offset, index) => {
        const distance = Math.abs(offset - currentLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestStep = index;
        }
      });

      return nearestStep;
    }

    function settleRankedScroll() {
      scrollToStep(findNearestStep());
    }

    function queueRankedSettle() {
      if (!rankedTrack || isPointerDown || isProgrammaticScroll) return;

      window.clearTimeout(rankedSettleTimer);
      rankedSettleTimer = window.setTimeout(settleRankedScroll, 120);
    }

    function handleRankedPointerEnd(event) {
      if (!isPointerDown) return;

      isPointerDown = false;
      if (event && typeof event.pointerId === "number" && rankedTrack.hasPointerCapture(event.pointerId)) {
        rankedTrack.releasePointerCapture(event.pointerId);
      }

      rankedTrack.classList.remove("is-dragging");
      if (!hasDragged) return;
      settleRankedScroll();
    }

    syncRankedOffsets();
    rankedSliderStep = Math.max(0, Math.min(rankedSliderStep, getMaxRankedStep()));

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        scrollToStep(rankedSliderStep + 1);
      });
    }

    if (rankedTrack) {
      rankedTrack.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button, a")) return;

        isPointerDown = true;
        hasDragged = false;
        startX = event.clientX;
        startScroll = rankedTrack.scrollLeft;
        rankedTrack.setPointerCapture(event.pointerId);
        rankedTrack.classList.add("is-dragging");
      });

      rankedTrack.addEventListener("pointermove", (event) => {
        if (!isPointerDown) return;

        const deltaX = event.clientX - startX;
        if (Math.abs(deltaX) > 6) hasDragged = true;

        rankedTrack.scrollLeft = startScroll - deltaX;
      });

      rankedTrack.addEventListener("pointerup", handleRankedPointerEnd);
      rankedTrack.addEventListener("pointercancel", handleRankedPointerEnd);
      rankedTrack.addEventListener("pointerleave", handleRankedPointerEnd);
      rankedTrack.addEventListener("scroll", queueRankedSettle);

      window.addEventListener("resize", () => {
        syncRankedOffsets();
        scrollToStep(rankedSliderStep, "auto");
      });
    }

    scrollToStep(rankedSliderStep, "auto");
    bindCardActions(rankedDormGrid);
  }

  function renderResultsSection() {
    if (!hasAppliedSelection()) {
      renderFeaturedDormCards();
      return;
    }

    const rankedDorms = rankDormsByPlaceholderAlgorithm();
    renderRankedDormCards(rankedDorms);
  }

  // =====================================================
  // Compare table rendering
  // 对比表渲染：根据 compare mode 调整展示顺序
  // =====================================================

  function getDormsForCompareMode(mode) {
    const list = [...DORMS];

    if (mode === "quiet") {
      return list.sort((a, b) => {
        const score = (name) => {
          if (name.startsWith("Lena")) return 0;
          if (name.startsWith("Wright")) return 1;
          return 2;
        };
        return score(a.name) - score(b.name);
      });
    }

    if (mode === "city") {
      return list.sort((a, b) => {
        const score = (name) => {
          if (name.startsWith("Warrumbul")) return 0;
          if (name.startsWith("Lena")) return 1;
          return 2;
        };
        return score(a.name) - score(b.name);
      });
    }

    if (mode === "value") {
      return list.sort((a, b) => {
        const score = (name) => {
          if (name.startsWith("Wright")) return 0;
          if (name.startsWith("Warrumbul")) return 1;
          return 2;
        };
        return score(a.name) - score(b.name);
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderCompareTable() {
    const dormsForTable = getDormsForCompareMode(state.compareMode);

    const modeTextMap = {
      default: "Current compare mode: default overview.",
      quiet: "Current compare mode: quiet-priority ordering.",
      city: "Current compare mode: city-priority ordering.",
      value: "Current compare mode: value-priority ordering."
    };

    compareModeText.textContent = modeTextMap[state.compareMode] || modeTextMap.default;

    compareBody.innerHTML = dormsForTable
      .map((dorm) => {
        return `
          <tr>
            <td>${dorm.name}</td>
            <td>${dorm.bestFor}</td>
            <td>${dorm.locationFeel}</td>
            <td>${dorm.tradeOff}</td>
          </tr>
        `;
      })
      .join("");
  }

  // =====================================================
  // Main render and user flow control
  // 主渲染流程：统一触发页面刷新、Continue、Reset
  // =====================================================

  function renderAll() {
    reorderPanelsDOM();
    renderMajorOptions();
    renderHabitSelected();
    renderHabitOptions();
    renderRequirementOptions();
    updateActionButtons();
    renderCompareTable();
    updateHeroStatusText();
    bindPanelDrag();
  }

  function onSelectionChanged() {
    renderAll();

    if (hasAppliedSelection() && !hasUnappliedChanges()) {
      renderResultsSection();
    }
  }

  function applySelectionFlow() {
    if (!isSelectionValid()) return false;
    rankedSliderStep = 0;

    appliedSnapshot = {
      panelOrder: deepClone(state.panelOrder),
      major: state.major,
      habits: deepClone(state.habits),
      requirements: deepClone(state.requirements)
    };

    renderResultsSection();
    updateActionButtons();
    updateHeroStatusText();
    return true;
  }

  function runSelectionFlow() {
    if (continueBtn.disabled) return;
    if (!applySelectionFlow()) return;

    transitionToExplorePage();
  }

  function resetSelectionFlow() {
    if (resetBtn.disabled) return;

    const next = deepClone(DEFAULT_STATE);
    state.panelOrder = next.panelOrder;
    state.major = next.major;
    state.habits = next.habits;
    state.requirements = next.requirements;
    state.compareMode = next.compareMode;

    appliedSnapshot = null;

    compareModeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === state.compareMode);
    });

    renderAll();
    renderResultsSection();
    if (homeStage !== "path") {
      setHomeStage("path");
    }
  }

  // =====================================================
  // Initial event binding
  // 初始事件绑定：Hero CTA、Continue、Reset、Compare mode
  // =====================================================

  if (startExploringBtn) {
    startExploringBtn.addEventListener("click", () => {
      setHomeStage("path");
    });
  }

  if (compareHeroBtn) {
    compareHeroBtn.addEventListener("click", () => {
      showResultsPage(compareSection);
    });
  }

  window.addEventListener("wheel", handleHeroCurtainWheel, { passive: false });

  continueBtn.addEventListener("click", runSelectionFlow);
  resetBtn.addEventListener("click", resetSelectionFlow);

  compareModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.compareMode = button.dataset.mode;

      compareModeButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.mode === state.compareMode);
      });

      renderCompareTable();
    });
  });

  renderAll();
  renderResultsSection();

  if (window.location.hash === "#homeResults") {
    showResultsPage(homeResults);
  } else if (window.location.hash === "#compare") {
    showResultsPage(compareSection);
  } else if (window.location.hash === "#homePath") {
    setHomeStage("path");
  } else {
    setHomeStage("hero");
  }
})();
