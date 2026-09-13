import { getSupabaseClient } from "./supabaseClient.js";

export const LEDGER_STATES_TABLE = "ledger_states";
export const LEDGER_SCHEMA_VERSION = 3;

export function validateLedgerState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (String(value.schemaVersion) !== String(LEDGER_SCHEMA_VERSION)) return false;
  if (!["rows", "recs", "accts", "skip"].every((key) => Array.isArray(value[key]))) {
    return false;
  }
  return Number.isFinite(Number(value.rateCny)) && Number(value.rateCny) > 0;
}

export async function getLedgerCloudContext() {
  const client = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session || sessionData.session.user?.is_anonymous) {
    return { client, user: null };
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user || userData.user.is_anonymous) return { client, user: null };
  return { client, user: userData.user };
}

export async function loadLedgerState(client) {
  const { data, error } = await client
    .from(LEDGER_STATES_TABLE)
    .select("ledger_state,updated_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!validateLedgerState(data.ledger_state)) {
    throw new Error("云端账本格式无效，已保留本机数据。");
  }
  return {
    state: data.ledger_state,
    updatedAt: data.updated_at || ""
  };
}

export async function saveLedgerState(client, userId, state) {
  if (!userId) throw new Error("没有可用的登录账户。");
  if (!validateLedgerState(state)) throw new Error("本机账本格式无效，未上传。");

  const { data, error } = await client
    .from(LEDGER_STATES_TABLE)
    .upsert(
      {
        owner_id: userId,
        schema_version: LEDGER_SCHEMA_VERSION,
        ledger_state: state
      },
      { onConflict: "owner_id" }
    )
    .select("updated_at")
    .single();
  if (error) throw error;
  return { updatedAt: data?.updated_at || new Date().toISOString() };
}
