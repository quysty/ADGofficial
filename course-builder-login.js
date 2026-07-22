import { getSupabaseClient } from "./src/backend/supabaseClient.js";
import { SUPABASE_CONFIG } from "./src/backend/supabase-config.js";

const TABLE_NAME = "course_builder_plans";
const MAX_PLANS = 3;
const ANONYMOUS_SESSION_BACKUP_KEY = "anu-course-builder-anonymous-session-v1";

const loginForm = document.querySelector("#courseLoginForm");
const emailInput = document.querySelector("#courseLoginEmail");
const passwordInput = document.querySelector("#courseLoginPassword");
const passwordButton = document.querySelector("#courseLoginPasswordButton");
const retryButton = document.querySelector("#courseLoginRetry");
const migrationBanner = document.querySelector("#courseLoginMigration");
const migrationText = document.querySelector("#courseLoginMigrationText");
const status = document.querySelector("#courseLoginStatus");

let supabase = null;
let finishingLogin = false;
let anonymousSessionReady = true;
let authSubscription = null;

function setStatus(message, type = "") {
  status.textContent = message;
  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-success", type === "success");
}

function setBusy(busy) {
  [emailInput, passwordInput, passwordButton, retryButton]
    .forEach((element) => {
      element.disabled = busy;
    });
}

function friendlyError(error) {
  const message = String(error?.message || error || "未知错误");
  if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确。";
  if (/failed to fetch|network/i.test(message)) return "无法连接云端，请检查网络后重试。";
  return `登录失败：${message}`;
}

function isSessionError(error) {
  return /auth session missing|refresh token|invalid refresh|session.*not found|jwt.*expired/i.test(
    String(error?.message || error || "")
  );
}

function normaliseEmail() {
  const email = emailInput.value.trim().toLowerCase();
  if (!email || !emailInput.checkValidity()) {
    emailInput.focus();
    setStatus("请输入有效邮箱。", "error");
    return "";
  }
  return email;
}

function safeNextUrl() {
  const fallback = new URL("course-builder.html", window.location.href);
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested) return fallback;

  try {
    const candidate = new URL(requested, window.location.href);
    const filename = candidate.pathname.split("/").pop();
    return candidate.origin === window.location.origin && filename === "course-builder.html"
      ? candidate
      : fallback;
  } catch {
    return fallback;
  }
}

function saveAnonymousSession(session) {
  const existing = readAnonymousSession();
  const backup = {
    schema: "anu-course-builder-anonymous-session-v1",
    userId: session.user.id,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || 0,
    targetUserId: existing?.userId === session.user.id ? existing.targetUserId || null : null,
    targetEmail: existing?.userId === session.user.id ? existing.targetEmail || null : null
  };

  try {
    window.localStorage.setItem(ANONYMOUS_SESSION_BACKUP_KEY, JSON.stringify(backup));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function readAnonymousSession() {
  try {
    const raw = window.localStorage.getItem(ANONYMOUS_SESSION_BACKUP_KEY);
    if (!raw) return null;
    const backup = JSON.parse(raw);
    if (
      backup?.schema !== "anu-course-builder-anonymous-session-v1" ||
      typeof backup.userId !== "string" ||
      typeof backup.accessToken !== "string" ||
      typeof backup.refreshToken !== "string"
    ) {
      return null;
    }
    return backup;
  } catch {
    return null;
  }
}

function writeAnonymousSession(backup) {
  window.localStorage.setItem(ANONYMOUS_SESSION_BACKUP_KEY, JSON.stringify(backup));
}

function clearAnonymousSession() {
  try {
    window.localStorage.removeItem(ANONYMOUS_SESSION_BACKUP_KEY);
  } catch {
    // Supabase itself already requires browser storage; nothing else to clear here.
  }
}

async function refreshAnonymousSession(backup) {
  const response = await window.fetch(
    `${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_CONFIG.publishableKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: backup.refreshToken })
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token || !payload.refresh_token) {
    throw new Error(payload.msg || payload.message || "旧方案迁移凭证已失效。旧方案仍保存在云端。");
  }

  const refreshed = {
    ...backup,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600)
  };
  writeAnonymousSession(refreshed);
  return refreshed;
}

async function refreshAnonymousBackupBeforeSwitch() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session?.user?.is_anonymous) return;

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
  if (!refreshData.session || !saveAnonymousSession(refreshData.session)) {
    throw new Error("无法保留旧方案迁移会话。");
  }
}

async function requestAnonymousPlans(backup) {
  const endpoint = new URL("/rest/v1/course_builder_plans", SUPABASE_CONFIG.url);
  endpoint.searchParams.set("select", "slot,name,plan_state,updated_at");
  endpoint.searchParams.set("order", "slot.asc");

  return window.fetch(endpoint, {
    headers: {
      Accept: "application/json",
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${backup.accessToken}`
    }
  });
}

async function fetchAnonymousPlans(initialBackup) {
  let backup = initialBackup;
  let response = await requestAnonymousPlans(backup);

  if (response.status === 401) {
    backup = await refreshAnonymousSession(backup);
    response = await requestAnonymousPlans(backup);
  }

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    const message = payload?.message || payload?.msg || "无法读取旧方案。";
    throw new Error(message);
  }
  return Array.isArray(payload) ? payload : [];
}

function planSignature(plan) {
  return JSON.stringify([plan.name, plan.plan_state]);
}

function firstFreeSlot(usedSlots) {
  for (let slot = 1; slot <= MAX_PLANS; slot += 1) {
    if (!usedSlots.has(slot)) return slot;
  }
  return null;
}

async function migrateAnonymousPlans(currentUser) {
  const backup = readAnonymousSession();
  if (!backup) return { found: false, total: 0, copied: 0, matched: 0, pending: 0 };
  if (backup.userId === currentUser.id) {
    clearAnonymousSession();
    return { found: false, total: 0, copied: 0, matched: 0, pending: 0 };
  }
  if (backup.targetUserId && backup.targetUserId !== currentUser.id) {
    throw new Error("旧方案已经绑定到首次选择的账户，不能自动复制到另一个账户。");
  }
  if (!backup.targetUserId) {
    backup.targetUserId = currentUser.id;
    backup.targetEmail = currentUser.email || null;
    writeAnonymousSession(backup);
  }

  const sourcePlans = await fetchAnonymousPlans(backup);
  if (sourcePlans.length === 0) {
    clearAnonymousSession();
    return { found: true, total: 0, copied: 0, matched: 0, pending: 0 };
  }

  const { data: targetPlans, error: targetError } = await supabase
    .from(TABLE_NAME)
    .select("slot,name,plan_state")
    .order("slot", { ascending: true });
  if (targetError) throw targetError;

  const existing = targetPlans || [];
  const signatures = new Set(existing.map(planSignature));
  const usedSlots = new Set(existing.map((plan) => Number(plan.slot)));
  const payloads = [];
  let matched = 0;
  let pending = 0;

  sourcePlans.forEach((plan) => {
    if (signatures.has(planSignature(plan))) {
      matched += 1;
      return;
    }

    const oldSlot = Number(plan.slot);
    const slot = !usedSlots.has(oldSlot) && oldSlot >= 1 && oldSlot <= MAX_PLANS
      ? oldSlot
      : firstFreeSlot(usedSlots);
    if (!slot) {
      pending += 1;
      return;
    }

    usedSlots.add(slot);
    payloads.push({
      owner_id: currentUser.id,
      slot,
      name: plan.name,
      plan_state: plan.plan_state,
      updated_at: plan.updated_at || new Date().toISOString()
    });
  });

  if (payloads.length > 0) {
    const { error: insertError } = await supabase.from(TABLE_NAME).insert(payloads);
    if (insertError) throw insertError;
  }

  if (pending === 0) clearAnonymousSession();
  return {
    found: true,
    total: sourcePlans.length,
    copied: payloads.length,
    matched,
    pending
  };
}

function redirectToCourseBuilder(migration) {
  const target = safeNextUrl();
  if (migration.copied > 0) target.searchParams.set("migrated", String(migration.copied));
  if (migration.matched > 0) target.searchParams.set("migrationMatched", String(migration.matched));
  if (migration.pending > 0) target.searchParams.set("migrationPending", String(migration.pending));
  window.location.replace(target.toString());
}

async function finishLogin() {
  if (finishingLogin) return;
  finishingLogin = true;
  retryButton.hidden = true;
  setBusy(true);
  setStatus("登录成功，正在连接你的云端方案…");

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user || data.user.is_anonymous) throw new Error("账户登录尚未完成。");

    const migration = await migrateAnonymousPlans(data.user);
    redirectToCourseBuilder(migration);
  } catch (error) {
    console.error(error);
    finishingLogin = false;
    setBusy(false);
    retryButton.hidden = false;
    setStatus(`账户已登录，但旧方案同步尚未完成：${friendlyError(error)}`, "error");
  }
}

async function showAnonymousMigration(session) {
  anonymousSessionReady = saveAnonymousSession(session);
  if (!anonymousSessionReady) {
    setStatus("浏览器无法保留旧会话，已暂停登录切换，以免现有方案无法迁移。", "error");
    setBusy(true);
    return;
  }

  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("slot", { count: "exact", head: true });
  if (error) throw error;

  if (count > 0) {
    migrationBanner.hidden = false;
    migrationText.textContent = `检测到 ${count} 个方案。登录成功后会从云端复制到你的账户，不覆盖账户已有方案。`;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = normaliseEmail();
  const password = passwordInput.value;
  if (!email) return;
  if (!password) {
    passwordInput.focus();
    setStatus("请输入密码。", "error");
    return;
  }
  if (!anonymousSessionReady) return;

  setBusy(true);
  setStatus("正在登录…");
  try {
    await refreshAnonymousBackupBeforeSwitch();
  } catch (error) {
    setBusy(false);
    setStatus(`无法安全切换账户：${friendlyError(error)}`, "error");
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setBusy(false);
    setStatus(friendlyError(error), "error");
    return;
  }
  await finishLogin();
});
retryButton.addEventListener("click", finishLogin);

async function initialiseLogin() {
  try {
    supabase = getSupabaseClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user?.is_anonymous &&
        (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      ) {
        saveAnonymousSession(session);
      }
    });
    authSubscription = authListener.subscription;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError && !isSessionError(sessionError)) throw sessionError;
    if (sessionError) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }

    if (!sessionError && sessionData.session) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError && !isSessionError(userError)) throw userError;
      if (userError) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
      if (userData.user && !userData.user.is_anonymous) {
        await finishLogin();
        return;
      }
      if (userData.user?.is_anonymous) {
        await showAnonymousMigration(sessionData.session);
        if (!anonymousSessionReady) return;
      }
    }

    setBusy(false);
    setStatus("请输入邮箱和密码。");
    emailInput.focus();
  } catch (error) {
    console.error(error);
    setBusy(false);
    setStatus(friendlyError(error), "error");
  }
}

setBusy(true);
initialiseLogin();

window.addEventListener("pagehide", () => authSubscription?.unsubscribe(), { once: true });
