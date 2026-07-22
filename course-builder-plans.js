import { getSupabaseClient } from "./src/backend/supabaseClient.js";

const MAX_PLANS = 3;
const TABLE_NAME = "course_builder_plans";
const quickSaveButton = document.querySelector("#coursePlanQuickSave");
const listToggleButton = document.querySelector("#coursePlanListToggle");
const planCount = document.querySelector("#coursePlanCount");
const panel = document.querySelector("#coursePlanPanel");
const closeButton = document.querySelector("#coursePlanClose");
const form = document.querySelector("#coursePlanForm");
const nameInput = document.querySelector("#coursePlanName");
const commitButton = document.querySelector("#coursePlanCommit");
const newButton = document.querySelector("#coursePlanNew");
const list = document.querySelector("#coursePlanList");
const status = document.querySelector("#coursePlanStatus");
const accountEmail = document.querySelector("#coursePlanAccountEmail");
const signOutButton = document.querySelector("#coursePlanSignOut");

let supabase = null;
let currentUser = null;
let plans = [];
let activeSlot = null;
let cloudReady = false;
let quickSaveLabelTimer = null;

function setQuickSaveLabel(label, resetAfter = 0) {
  window.clearTimeout(quickSaveLabelTimer);
  quickSaveButton.textContent = label;
  if (resetAfter > 0) {
    quickSaveLabelTimer = window.setTimeout(() => {
      quickSaveButton.textContent = "保存";
    }, resetAfter);
  }
}

function setStatus(message, type = "") {
  status.textContent = message;
  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-success", type === "success");
}

function friendlyError(error) {
  const message = String(error?.message || error || "未知错误");
  if (/failed to fetch|network/i.test(message)) {
    return "无法连接云端，请检查网络后重试。";
  }
  return `云端操作失败：${message}`;
}

function isSessionError(error) {
  return /auth session missing|refresh token|invalid refresh|session.*not found|jwt.*expired/i.test(
    String(error?.message || error || "")
  );
}

function redirectToLogin() {
  const loginUrl = new URL("course-builder-login.html", window.location.href);
  loginUrl.searchParams.set("next", "course-builder.html");
  window.location.replace(loginUrl.toString());
}

function consumeLoginNotice() {
  const url = new URL(window.location.href);
  const migrated = Number(url.searchParams.get("migrated") || 0);
  const matched = Number(url.searchParams.get("migrationMatched") || 0);
  const pending = Number(url.searchParams.get("migrationPending") || 0);
  ["migrated", "migrationMatched", "migrationPending"].forEach((key) => url.searchParams.delete(key));
  if (url.toString() !== window.location.href) {
    window.history.replaceState(null, "", url.toString());
  }

  if (pending > 0) {
    return {
      message: `已登录；${migrated + matched} 个旧方案已并入账户，另有 ${pending} 个因 3 个方案上限暂未并入。旧方案仍保存在云端。`,
      type: "error"
    };
  }
  if (migrated > 0 || matched > 0) {
    return {
      message: `已登录，${migrated + matched} 个原有方案已连接到此账户。`,
      type: "success"
    };
  }
  return { message: "云端已连接。", type: "success" };
}

function setPanelOpen(open) {
  panel.hidden = !open;
  listToggleButton.setAttribute("aria-expanded", String(open));
}

function firstFreeSlot() {
  const usedSlots = new Set(plans.map((plan) => Number(plan.slot)));
  for (let slot = 1; slot <= MAX_PLANS; slot += 1) {
    if (!usedSlots.has(slot)) return slot;
  }
  return null;
}

function activePlan() {
  return plans.find((plan) => Number(plan.slot) === activeSlot) || null;
}

function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function syncControls() {
  const count = plans.length;
  const canCreate = count < MAX_PLANS;
  planCount.textContent = `${count}/${MAX_PLANS}`;
  quickSaveButton.disabled = !cloudReady;
  listToggleButton.disabled = !cloudReady;
  newButton.disabled = !cloudReady || !canCreate;
  commitButton.disabled = !cloudReady || (activeSlot === null && !canCreate);
  commitButton.textContent = activeSlot === null ? "保存新方案" : "更新方案";
  listToggleButton.title = activePlan()?.name || `${count} 个云端方案`;
  accountEmail.textContent = currentUser?.email || "";
  accountEmail.title = currentUser?.email || "";
}

function renderPlans() {
  list.replaceChildren();

  if (plans.length === 0) {
    const empty = document.createElement("p");
    empty.className = "course-plan-empty";
    empty.textContent = "还没有保存方案。";
    list.append(empty);
  }

  plans.forEach((plan) => {
    const row = document.createElement("div");
    const details = document.createElement("div");
    const name = document.createElement("strong");
    const updated = document.createElement("span");
    const actions = document.createElement("div");
    const loadButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    row.className = "course-plan-row";
    row.classList.toggle("is-active", Number(plan.slot) === activeSlot);
    details.className = "course-plan-row__details";
    name.textContent = plan.name;
    name.title = plan.name;
    updated.textContent = formatUpdatedAt(plan.updated_at);
    actions.className = "course-plan-row__actions";
    loadButton.type = "button";
    loadButton.textContent = "载入";
    loadButton.dataset.action = "load";
    loadButton.dataset.slot = String(plan.slot);
    deleteButton.type = "button";
    deleteButton.textContent = "删除";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.slot = String(plan.slot);

    details.append(name, updated);
    actions.append(loadButton, deleteButton);
    row.append(details, actions);
    list.append(row);
  });

  syncControls();
}

async function refreshPlans() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("slot,name,plan_state,updated_at")
    .order("slot", { ascending: true });
  if (error) throw error;

  plans = data || [];
  if (activeSlot !== null && !activePlan()) activeSlot = null;
  renderPlans();
}

function startNewPlan() {
  activeSlot = null;
  nameInput.value = "";
  renderPlans();
  nameInput.focus();
  setStatus(plans.length >= MAX_PLANS ? "最多只能保存 3 个方案。" : "输入名称后保存当前排课。", plans.length >= MAX_PLANS ? "error" : "");
}

async function savePlan() {
  const name = nameInput.value.trim();
  if (!name) {
    setPanelOpen(true);
    nameInput.focus();
    setStatus("请先填写方案名称。", "error");
    return;
  }

  const slot = activeSlot ?? firstFreeSlot();
  if (!slot) {
    setStatus("最多只能保存 3 个方案；请先删除一个旧方案。", "error");
    return;
  }

  const planStateApi = window.CourseBuilderPlanState;
  if (!planStateApi?.exportPlan) {
    setStatus("课程方案尚未准备完成，请稍后再试。", "error");
    return;
  }

  commitButton.disabled = true;
  quickSaveButton.disabled = true;
  setQuickSaveLabel("保存中");
  setStatus("正在保存到云端…");

  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      owner_id: currentUser.id,
      slot,
      name,
      plan_state: planStateApi.exportPlan(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "owner_id,slot" }
  );

  if (error) throw error;
  activeSlot = slot;
  await refreshPlans();
  nameInput.value = activePlan()?.name || name;
  setQuickSaveLabel("已保存", 1400);
  setStatus("已保存到云端。", "success");
}

async function loadPlan(slot) {
  const plan = plans.find((item) => Number(item.slot) === slot);
  if (!plan) return;

  const result = window.CourseBuilderPlanState?.importPlan(plan.plan_state);
  if (!result) throw new Error("课程方案恢复接口尚未准备完成。");

  activeSlot = slot;
  nameInput.value = plan.name;
  renderPlans();
  setPanelOpen(false);
  setStatus(result.skipped ? `已载入，${result.skipped} 门课程因数据变化未恢复。` : "方案已载入。", result.skipped ? "error" : "success");
}

async function deletePlan(slot) {
  const plan = plans.find((item) => Number(item.slot) === slot);
  if (!plan || !window.confirm(`确定删除“${plan.name}”吗？`)) return;

  setStatus("正在删除…");
  const { error } = await supabase.from(TABLE_NAME).delete().eq("slot", slot);
  if (error) throw error;

  if (activeSlot === slot) {
    activeSlot = null;
    nameInput.value = "";
  }
  await refreshPlans();
  setStatus("方案已删除。", "success");
}

async function runCloudAction(action) {
  try {
    await action();
  } catch (error) {
    console.error(error);
    setQuickSaveLabel("保存失败", 1600);
    setStatus(friendlyError(error), "error");
    syncControls();
  }
}

quickSaveButton.addEventListener("click", () => {
  if (activeSlot === null) {
    setPanelOpen(true);
    nameInput.focus();
    return;
  }
  runCloudAction(savePlan);
});

listToggleButton.addEventListener("click", () => {
  setPanelOpen(panel.hidden);
});

closeButton.addEventListener("click", () => setPanelOpen(false));
newButton.addEventListener("click", startNewPlan);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runCloudAction(savePlan);
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const slot = Number(button.dataset.slot);
  if (button.dataset.action === "load") runCloudAction(() => loadPlan(slot));
  if (button.dataset.action === "delete") runCloudAction(() => deletePlan(slot));
});

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  setStatus("正在退出…");
  try {
    const { error } = await supabase?.auth.signOut({ scope: "local" });
    if (error) throw error;
  } catch (error) {
    console.error(error);
    signOutButton.disabled = false;
    setStatus(friendlyError(error), "error");
    return;
  }
  redirectToLogin();
});

async function initialiseCloudPlans() {
  supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError && isSessionError(sessionError)) return redirectToLogin();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return redirectToLogin();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError && isSessionError(userError)) return redirectToLogin();
  if (userError) throw userError;
  if (!userData.user || userData.user.is_anonymous) return redirectToLogin();

  currentUser = userData.user;
  cloudReady = true;
  await refreshPlans();
  const notice = consumeLoginNotice();
  setStatus(notice.message, notice.type);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session || session.user?.is_anonymous) redirectToLogin();
  });
}

runCloudAction(initialiseCloudPlans);
