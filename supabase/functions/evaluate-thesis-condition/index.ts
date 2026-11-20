import { createClient } from "npm:@supabase/supabase-js@2";
import { evaluateCondition } from "../_shared/evidence-watch.mjs";

const corsOrigins = new Set(["https://cmc-lens.vercel.app", "http://localhost:3000"]);
const marketUrl = "https://cmc-lens.vercel.app/api/market";
const MAX_FRESH_MS = 15 * 60 * 1000;
const CHECK_COOLDOWN_MS = 60 * 1000;

function corsHeaders(origin) {
  const allowed = origin && corsOrigins.has(origin) ? origin : "https://cmc-lens.vercel.app";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body, status = 200, origin = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function validUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function eventView(row) {
  return {
    id: row.id,
    checkId: row.check_id,
    conditionId: row.condition_id,
    outcome: row.outcome,
    ruleSnapshot: row.rule_snapshot,
    observedValue: row.observed_value,
    threshold: row.threshold,
    unit: row.unit,
    sourceProvider: row.source_provider,
    sourceEndpoint: row.source_endpoint,
    sourceObservedAt: row.source_observed_at,
    evaluatedAt: row.evaluated_at,
    coverage: row.coverage,
    freshness: row.freshness,
    sourceReceipt: row.source_receipt,
    detail: row.detail,
  };
}

function safeReceipt(receipts, provider) {
  if (!Array.isArray(receipts) || !receipts.length) return {};
  const row = receipts[0];
  const cache = row.appCache && typeof row.appCache === "object" ? row.appCache : {};
  return {
    provider: typeof row.provider === "string" ? row.provider.slice(0, 80) : provider,
    endpoint: typeof row.endpoint === "string" ? row.endpoint.slice(0, 160) : null,
    outcome: typeof row.outcome === "string" ? row.outcome.slice(0, 24) : "unknown",
    upstreamStatus: Number.isFinite(Number(row.upstreamStatus)) ? Number(row.upstreamStatus) : null,
    recordCount: Number.isFinite(Number(row.recordCount)) ? Number(row.recordCount) : null,
    cacheStatus: typeof cache.status === "string" ? cache.status.slice(0, 24) : "unknown",
    servedAt: typeof cache.servedAt === "string" ? cache.servedAt : null,
    sourceRetrievedAt: typeof cache.sourceRetrievedAt === "string" ? cache.sourceRetrievedAt : null,
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, origin);

  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken || accessToken === authHeader) return json({ error: "AUTH_REQUIRED" }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "SERVICE_UNAVAILABLE" }, 503, origin);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  const user = userData?.user;
  if (userError || !user?.id) return json({ error: "AUTH_REQUIRED" }, 401, origin);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400, origin);
  }
  const thesisId = body.thesisId;
  const conditionId = body.conditionId;
  const checkId = body.checkId;
  if (!validUuid(thesisId) || !validUuid(conditionId) || !validUuid(checkId)) return json({ error: "INVALID_REQUEST" }, 400, origin);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: condition, error: conditionError } = await admin
    .from("thesis_conditions")
    .select("id,owner_id,thesis_id,condition_type,metric_key,operator,threshold,unit,effect,description,active,updated_at")
    .eq("id", conditionId)
    .eq("owner_id", user.id)
    .eq("thesis_id", thesisId)
    .maybeSingle();
  if (conditionError || !condition) return json({ error: "CONDITION_NOT_FOUND" }, 404, origin);
  if (!condition.active) return json({ error: "CONDITION_PAUSED" }, 409, origin);
  if (condition.condition_type !== "threshold" || !["change_24h_pct", "market_cap_usd"].includes(condition.metric_key) ||
      !["lt", "lte", "gt", "gte"].includes(condition.operator) || (condition.threshold === null || !Number.isFinite(Number(condition.threshold)))) {
    return json({ error: "UNSUPPORTED_RULE" }, 422, origin);
  }

  const { data: thesis, error: thesisError } = await admin
    .from("theses")
    .select("id,owner_id,primary_asset_id,primary_asset_symbol")
    .eq("id", thesisId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (thesisError || !thesis || !/^\d{1,12}$/.test(String(thesis.primary_asset_id || ""))) return json({ error: "ASSET_NOT_AVAILABLE" }, 422, origin);

  const { data: duplicate } = await admin
    .from("thesis_condition_events")
    .select("*")
    .eq("owner_id", user.id)
    .eq("condition_id", conditionId)
    .eq("check_id", checkId)
    .maybeSingle();
  if (duplicate) return json({ event: eventView(duplicate), cooldown: false }, 200, origin);

  const { data: recent } = await admin
    .from("thesis_condition_events")
    .select("*")
    .eq("owner_id", user.id)
    .eq("condition_id", conditionId)
    .order("evaluated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - Date.parse(recent.evaluated_at) < CHECK_COOLDOWN_MS) return json({ event: eventView(recent), cooldown: true }, 200, origin);

  let market = null;
  try {
    const response = await fetch(marketUrl + "?view=asset&id=" + encodeURIComponent(String(thesis.primary_asset_id)), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) market = await response.json();
  } catch {
    market = null;
  }

  const now = new Date();
  const asset = market?.asset && typeof market.asset === "object" ? market.asset : null;
  const mode = market?.mode;
  const metric = condition.metric_key;
  const sourceObservedAt = typeof asset?.observedAt === "string" ? asset.observedAt : null;
  const receipts = market?.sourceReceipts;
  const receipt = safeReceipt(receipts, mode === "live" ? "CoinMarketCap" : "unavailable");
  const receiptValid = (receipt.outcome === "success" && Number(receipt.upstreamStatus) >= 200 && Number(receipt.upstreamStatus) < 300) ||
    (receipt.cacheStatus === "hit" && Boolean(receipt.sourceRetrievedAt));
  const live = mode === "live" && String(asset?.id || "") === String(thesis.primary_asset_id) && receiptValid;
  const threshold = Number(condition.threshold);
  const expectedUnit = metric === "change_24h_pct" ? "%" : "USD";
  if (condition.unit && condition.unit !== expectedUnit) return json({ error: "UNSUPPORTED_RULE" }, 422, origin);
  const evaluation = evaluateCondition({
    condition, asset, mode, expectedAssetId: String(thesis.primary_asset_id),
    now: now.getTime(), maxAgeMs: MAX_FRESH_MS, receiptValid,
  });
  const { outcome, freshness, detail, observedValue } = evaluation;

  const eventRow = {
    owner_id: user.id,
    thesis_id: thesis.id,
    condition_id: condition.id,
    check_id: checkId,
    outcome,
    rule_snapshot: {
      metricKey: condition.metric_key,
      operator: condition.operator,
      threshold,
      unit: condition.unit || (metric === "change_24h_pct" ? "%" : "USD"),
      effect: condition.effect,
      description: condition.description || "",
      active: condition.active,
      version: 1,
    },
    observed_value: observedValue,
    threshold,
    unit: condition.unit || (metric === "change_24h_pct" ? "%" : "USD"),
    source_provider: live ? "CoinMarketCap" : mode === "demo" ? "Demo dataset" : "unavailable",
    source_endpoint: live && typeof receipt.endpoint === "string" ? receipt.endpoint : null,
    source_observed_at: sourceObservedAt,
    evaluated_at: now.toISOString(),
    coverage: outcome === "met" || outcome === "not_met" ? "complete" : "unavailable",
    freshness,
    source_receipt: receipt,
    detail,
  };

  const { data: inserted, error: insertError } = await admin
    .from("thesis_condition_events")
    .insert(eventRow)
    .select("*")
    .single();
  if (insertError || !inserted) return json({ error: "EVENT_WRITE_FAILED" }, 500, origin);
  return json({ event: eventView(inserted), cooldown: false }, 200, origin);
});
