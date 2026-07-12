import { SUPABASE_CONFIG } from "./supabase-config.js";

export const PUBLIC_PAGE_PUBLISH_REQUESTS_TABLE = "public_page_publish_requests";
export const PUBLIC_PAGE_PUBLISH_RPC = "enqueue_public_page_publish";
export const PUBLIC_PAGE_PUBLISH_FUNCTION = "publish-public-pages";
export const PUBLIC_PAGE_PUBLISH_FUNCTION_PATH = `/functions/v1/${PUBLIC_PAGE_PUBLISH_FUNCTION}`;

export const PUBLIC_PAGE_PUBLISH_SCOPES = Object.freeze({
  DORM_DETAILS: "dorm_details",
  BUILDING_HEIGHTS: "building_heights",
  SITE_PAGES: "site_pages"
});

export const PUBLIC_PAGE_PUBLISH_SCOPE_LABELS = Object.freeze({
  [PUBLIC_PAGE_PUBLISH_SCOPES.DORM_DETAILS]: "宿舍详情",
  [PUBLIC_PAGE_PUBLISH_SCOPES.BUILDING_HEIGHTS]: "建筑高度",
  [PUBLIC_PAGE_PUBLISH_SCOPES.SITE_PAGES]: "页面配置"
});

export function isAllowedPublicPagePublishScope(scope) {
  return Object.values(PUBLIC_PAGE_PUBLISH_SCOPES).includes(scope);
}

function describeEdgeFunctionError(data, status) {
  const stringify = (value) => {
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object") {
      const nested = stringify(value.message || value.error || value.error_description);
      if (nested) return nested;
      try {
        return JSON.stringify(value);
      } catch (error) {
        return String(value);
      }
    }
    return value == null ? "" : String(value);
  };

  const candidate = stringify(data?.error ?? data?.message ?? data?.error_description ?? data?.raw);
  if (candidate) return candidate;
  const fallback = stringify(data);
  if (fallback) return fallback;
  return `Edge Function returned ${status}`;
}

function describeThrownError(error) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch (stringifyError) {
      return String(error);
    }
  }
  return String(error || "Unknown fetch error");
}

export async function enqueuePublicPagePublishRequest(client, scope, details = {}) {
  if (!client) {
    return {
      data: null,
      error: new Error("Supabase client is not ready.")
    };
  }

  if (!isAllowedPublicPagePublishScope(scope)) {
    return {
      data: null,
      error: new Error("这个发布范围没有被权限白名单允许。")
    };
  }

  return client.rpc(PUBLIC_PAGE_PUBLISH_RPC, {
    publish_scope_input: scope,
    request_details_input: details
  });
}

export async function invokePublicPagePublishRequest(client, requestId) {
  if (!client) {
    return {
      data: null,
      error: new Error("Supabase client is not ready.")
    };
  }

  if (!requestId) {
    return {
      data: null,
      error: new Error("Missing public publish request id.")
    };
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    return { data: null, error: sessionError };
  }

  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    return {
      data: null,
      error: new Error("Missing admin session token.")
    };
  }

  const functionUrl = `${SUPABASE_CONFIG.url}${PUBLIC_PAGE_PUBLISH_FUNCTION_PATH}`;
  let response = null;
  try {
    response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        apikey: SUPABASE_CONFIG.publishableKey,
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ requestId })
    });
  } catch (error) {
    const message = describeThrownError(error);
    return {
      data: { stage: "fetch", functionUrl, error: message },
      error: new Error(`Edge Function request failed: ${message}`)
    };
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = describeEdgeFunctionError(data, response.status);
    return {
      data: {
        stage: "response",
        status: response.status,
        body: data
      },
      error: new Error(`Edge Function returned ${response.status}: ${message}`)
    };
  }

  return { data, error: null };
}
