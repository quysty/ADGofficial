import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type PublishScope = "dorm_details" | "building_heights" | "site_pages";

type PublishRequest = {
  id: string;
  publish_scope: PublishScope;
  requested_by: string;
  requested_email: string;
  request_details: Record<string, unknown>;
};

type AuthorizedAdmin = {
  userId: string;
  email: string;
  role: string;
};

const ALLOWED_SCOPES = new Set<PublishScope>(["dorm_details", "building_heights", "site_pages"]);
const OUTPUT_PATHS: Record<PublishScope, string> = {
  dorm_details: "config/published/dorm-details.json",
  building_heights: "config/published/building-heights.json",
  site_pages: "config/published/site-pages.json"
};
const MANIFEST_PATH = "config/published/publish-manifest.json";
const ALLOWED_OUTPUT_PATHS = new Set([...Object.values(OUTPUT_PATHS), MANIFEST_PATH]);
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function assertAllowedPath(path: string) {
  if (!ALLOWED_OUTPUT_PATHS.has(path)) {
    throw new Error(`Blocked non-allowlisted output path: ${path}`);
  }
}

function encodeGitHubPath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function jsonFile(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function sanitizeSitePage(page: unknown, index: number) {
  if (!page || typeof page !== "object") {
    throw new Error(`Invalid site page at index ${index + 1}.`);
  }

  const record = page as Record<string, unknown>;
  const key = cleanText(record.key);
  const label = cleanText(record.label);
  const href = cleanText(record.href);
  const role = cleanText(record.role, "page");
  const status = record.status === "hidden" ? "hidden" : "public";
  const showInNavigation = status === "hidden" ? false : record.showInNavigation !== false;

  if (!/^[a-z0-9][a-z0-9_-]{0,48}$/i.test(key)) {
    throw new Error(`Blocked invalid site page key: ${key || "(empty)"}`);
  }

  if (!label || label.length > 80) {
    throw new Error(`Blocked invalid site page label for ${key}.`);
  }

  if (
    !/^[a-z0-9][a-z0-9_/-]*\.html(?:\?[a-z0-9_.=&%-]+)?$/i.test(href) ||
    href.includes("..") ||
    href.includes("//")
  ) {
    throw new Error(`Blocked invalid site page href for ${key}: ${href}`);
  }

  if (!/^[a-z0-9 _-]{1,40}$/i.test(role)) {
    throw new Error(`Blocked invalid site page role for ${key}.`);
  }

  return {
    key,
    label,
    href,
    status,
    showInNavigation,
    role
  };
}

function describeUnknownError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const nested = record.message || record.error || record.error_description;
    if (nested && nested !== error) return describeUnknownError(nested);

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return error == null ? "Unknown error" : String(error);
}

async function githubRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getEnv("GITHUB_TOKEN");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.message || `GitHub request failed: ${response.status}`);
  }

  return body as T;
}

async function getExistingFileSha(owner: string, repo: string, path: string, branch: string) {
  assertAllowedPath(path);
  try {
    const body = await githubRequest<{ sha?: string }>(
      `/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(branch)}`
    );
    return body.sha || null;
  } catch (error) {
    if (String(error).includes("Not Found")) return null;
    throw error;
  }
}

function encodeContent(content: string) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function putGithubFile({
  owner,
  repo,
  branch,
  path,
  content,
  message
}: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}) {
  assertAllowedPath(path);
  const sha = await getExistingFileSha(owner, repo, path, branch);
  return githubRequest<{
    commit?: {
      sha?: string;
      html_url?: string;
    };
  }>(`/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: encodeContent(content),
      branch,
      ...(sha ? { sha } : {})
    })
  });
}

async function loadQueuedRequest(supabase: ReturnType<typeof createClient>, requestId: string) {
  const { data, error } = await supabase
    .from("public_page_publish_requests")
    .select("id,publish_scope,requested_by,requested_email,request_details")
    .eq("id", requestId)
    .eq("status", "queued")
    .single();

  if (error) throw error;
  if (!data || !ALLOWED_SCOPES.has(data.publish_scope)) {
    throw new Error("Publish request is missing or has a blocked scope.");
  }

  return data as PublishRequest;
}

async function requireAuthorizedAdmin(
  supabase: ReturnType<typeof createClient>,
  request: Request
): Promise<AuthorizedAdmin> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new Error("Missing admin authorization token.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    throw new Error("Invalid admin authorization token.");
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("email,role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError) throw adminError;
  if (!adminRow) {
    throw new Error("Signed-in user is not an admin.");
  }

  return {
    userId: userData.user.id,
    email: adminRow.email || userData.user.email || "unknown",
    role: adminRow.role || "Clevel"
  };
}

async function exportDormDetails(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("building_label_overrides")
    .select(
      [
        "building_number",
        "building_id",
        "display_name",
        "short_name",
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
      ].join(",")
    )
    .eq("display_mode", "dorm")
    .eq("type_key", "dorm")
    .order("building_number", { ascending: true });

  if (error) throw error;

  return {
    schema: "anu-explore-dorm-details-v1",
    generatedAt: new Date().toISOString(),
    source: "supabase.building_label_overrides",
    rows: data || []
  };
}

async function exportBuildingHeights(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("building_height_overrides")
    .select(
      [
        "building_number",
        "published_multiplier",
        "published_copy_from_building_number",
        "published_at",
        "published_by",
        "updated_at"
      ].join(",")
    )
    .or("published_multiplier.not.is.null,published_copy_from_building_number.not.is.null")
    .order("building_number", { ascending: true });

  if (error) throw error;

  return {
    schema: "anu-explore-building-heights-v1",
    generatedAt: new Date().toISOString(),
    source: "supabase.building_height_overrides",
    rows: data || []
  };
}

function exportSitePages(requestRow: PublishRequest) {
  const details = requestRow.request_details || {};
  const rawPages = Array.isArray(details.sitePages) ? details.sitePages : [];
  if (!rawPages.length || rawPages.length > 30) {
    throw new Error("Site page publish requires 1-30 pages.");
  }

  return {
    schema: "anu-explore-site-pages-v1",
    generatedAt: new Date().toISOString(),
    source: "admin.site_page_registry",
    projectName: cleanText(details.projectName, "ANU Explore Project"),
    publicUrl: cleanText(details.publicUrl, "https://www.anuexplore.com"),
    pages: rawPages.map(sanitizeSitePage)
  };
}

async function exportScope(
  supabase: ReturnType<typeof createClient>,
  requestRow: PublishRequest
) {
  const scope = requestRow.publish_scope;
  if (scope === "dorm_details") return exportDormDetails(supabase);
  if (scope === "building_heights") return exportBuildingHeights(supabase);
  if (scope === "site_pages") return exportSitePages(requestRow);
  throw new Error(`Blocked publish scope: ${scope}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "content-type": "application/json" }
    });
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("PUBLIC_PUBLISH_SERVICE_ROLE_KEY");
  const owner = getEnv("GITHUB_OWNER");
  const repo = getEnv("GITHUB_REPO");
  const branch = Deno.env.get("GITHUB_BRANCH") || "main";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  let authorizedAdmin: AuthorizedAdmin | null = null;
  let requestId = "";
  let requestRow: PublishRequest | null = null;

  try {
    authorizedAdmin = await requireAuthorizedAdmin(supabase, request);
    const body = await request.json();
    requestId = String(body?.requestId || "");
    if (!requestId) throw new Error("Missing requestId.");

    requestRow = await loadQueuedRequest(supabase, requestId);
    const scope = requestRow.publish_scope;
    const outputPath = OUTPUT_PATHS[scope];
    assertAllowedPath(outputPath);

    await supabase
      .from("public_page_publish_requests")
      .update({ status: "running", error_message: null })
      .eq("id", requestRow.id);

    const exported = await exportScope(supabase, requestRow);
    const generatedAt = new Date().toISOString();
    const message = `Publish ${scope.replace("_", " ")} from Supabase`;
    const commit = await putGithubFile({
      owner,
      repo,
      branch,
      path: outputPath,
      content: jsonFile(exported),
      message
    });

    const manifest = {
      schema: "anu-explore-public-publish-manifest-v1",
      generatedAt,
      lastScope: scope,
      lastRequestId: requestRow.id,
      allowedScopes: [...ALLOWED_SCOPES],
      allowedOutputPaths: [...ALLOWED_OUTPUT_PATHS]
    };
    const manifestCommit = await putGithubFile({
      owner,
      repo,
      branch,
      path: MANIFEST_PATH,
      content: jsonFile(manifest),
      message: `Update publish manifest for ${scope.replace("_", " ")}`
    });

    const commitSha = manifestCommit.commit?.sha || commit.commit?.sha || null;
    const commitUrl = manifestCommit.commit?.html_url || commit.commit?.html_url || null;
    const resultDetails = {
      outputPath,
      manifestPath: MANIFEST_PATH,
      rowCount: Array.isArray((exported as { rows?: unknown[] }).rows)
        ? (exported as { rows: unknown[] }).rows.length
        : null
    };

    await supabase
      .from("public_page_publish_requests")
      .update({
        status: "succeeded",
        result_details: resultDetails,
        commit_sha: commitSha,
        commit_url: commitUrl,
        completed_at: generatedAt
      })
      .eq("id", requestRow.id);

    await supabase.from("admin_operation_logs").insert({
      actor_user_id: requestRow.requested_by,
      actor_email: requestRow.requested_email,
      permission_level: "Clevel",
      action: "complete_public_pages_publish",
      entity_type: "public_pages_publish",
      entity_id: requestRow.id,
      target_table: "public_page_publish_requests",
      status: "success",
      summary: `完成官网发布：${scope}`,
      details: {
        requestId: requestRow.id,
        publishScope: scope,
        commitSha,
        commitUrl,
        ...resultDetails
      }
    });

    return new Response(JSON.stringify({ ok: true, requestId: requestRow.id, commitSha, commitUrl }), {
      headers: { ...CORS_HEADERS, "content-type": "application/json" }
    });
  } catch (error) {
    const message = describeUnknownError(error);
    if (requestRow?.id) {
      await supabase
        .from("public_page_publish_requests")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString()
        })
        .eq("id", requestRow.id);

      await supabase.from("admin_operation_logs").insert({
        actor_user_id: requestRow.requested_by,
        actor_email: requestRow.requested_email,
        permission_level: "Clevel",
        action: "fail_public_pages_publish",
        entity_type: "public_pages_publish",
        entity_id: requestRow.id,
        target_table: "public_page_publish_requests",
        status: "failed",
        summary: `官网发布失败：${requestRow.publish_scope}`,
        details: {
          requestId: requestRow.id,
          publishScope: requestRow.publish_scope,
          error: message
        }
      });
    } else if (requestId && authorizedAdmin) {
      await supabase
        .from("public_page_publish_requests")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString()
        })
        .eq("id", requestId)
        .eq("status", "queued");

      await supabase.from("admin_operation_logs").insert({
        actor_user_id: authorizedAdmin.userId,
        actor_email: authorizedAdmin.email,
        permission_level: authorizedAdmin.role || "Clevel",
        action: "fail_public_pages_publish",
        entity_type: "public_pages_publish",
        entity_id: requestId,
        target_table: "public_page_publish_requests",
        status: "failed",
        summary: "官网发布失败：请求加载前",
        details: {
          requestId,
          error: message
        }
      });
    }

    return new Response(JSON.stringify({ ok: false, error: message, requestId: requestRow?.id || requestId || null }), {
      status: 500,
      headers: { ...CORS_HEADERS, "content-type": "application/json" }
    });
  }
});
