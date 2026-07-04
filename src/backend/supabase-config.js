export const SUPABASE_CONFIG = {
  url: "https://gjigfyndgqpxzqmprptr.supabase.co",
  publishableKey: "sb_publishable_3ve21JEkO44bn6thURhjSg_ktGdNiVJ"
};

export function getSupabaseConfigStatus() {
  const hasUrl =
    typeof SUPABASE_CONFIG.url === "string" &&
    SUPABASE_CONFIG.url.startsWith("https://") &&
    SUPABASE_CONFIG.url.includes(".supabase.co");
  const hasPublishableKey =
    typeof SUPABASE_CONFIG.publishableKey === "string" &&
    SUPABASE_CONFIG.publishableKey.startsWith("sb_publishable_");

  return {
    ready: hasUrl && hasPublishableKey,
    hasUrl,
    hasPublishableKey
  };
}
