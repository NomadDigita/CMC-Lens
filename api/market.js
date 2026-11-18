const demo = require("../data/demo");

const CMC_ORIGIN = "https://pro-api.coinmarketcap.com";
const SERVER_CACHE = new Map();
const CACHE_MS = 60_000;

function reply(res, status, body, headers = {}) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", status < 400 ? "s-maxage=60, stale-while-revalidate=300" : "no-store");
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(body);
}

function getCached(key, maxAge = CACHE_MS) {
  const item = SERVER_CACHE.get(key);
  if (!item || Date.now() - item.at > maxAge) return null;
  return item.value;
}

function setCached(key, value) {
  if (SERVER_CACHE.size > 100) SERVER_CACHE.clear();
  SERVER_CACHE.set(key, { at: Date.now(), value });
}

async function cmc(path, params, timeoutMs = 9000) {
  const url = new URL(`${CMC_ORIGIN}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": process.env.CMC_PRO_API_KEY, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  const payload = await response.json();
  const cmcCode = Number(payload?.status?.error_code ?? 0);
  if (!response.ok || (Number.isFinite(cmcCode) && cmcCode !== 0)) {
    const error = new Error("CoinMarketCap request failed");
    error.status = response.status;
    error.cmcCode = Number.isFinite(cmcCode) && cmcCode !== 0 ? cmcCode : undefined;
    error.cmcMessage = payload?.status?.error_message;
    throw error;
  }
  return payload.data;
}

function quoteFor(item) {
  if (Array.isArray(item?.quote)) return item.quote.find(q => q.symbol === "USD") || item.quote[0] || {};
  return item?.quote?.USD || {};
}

const CATEGORY_TAGS = new Map([
  ["meme", "Meme"], ["memes", "Meme"], ["memecoin", "Meme"], ["memecoins", "Meme"],
  ["gaming", "Gaming"], ["gamefi", "Gaming"], ["play-to-earn", "Gaming"],
  ["ai", "AI & Data"], ["artificial-intelligence", "AI & Data"], ["ai-big-data", "AI & Data"], ["ai-and-big-data", "AI & Data"], ["ai-agents", "AI & Data"],
  ["defi", "DeFi"], ["decentralized-finance", "DeFi"],
  ["layer-2", "Layer 2"], ["layer-2s", "Layer 2"], ["layer-2-l2", "Layer 2"], ["layer-2-l2s", "Layer 2"],
  ["layer-1", "Layer 1"], ["layer-1s", "Layer 1"], ["layer-1-l1", "Layer 1"], ["layer-1-l1s", "Layer 1"],
  ["smart-contracts", "Smart contracts"], ["smart-contract-platform", "Smart contracts"]
]);

function normalizeTagSlug(value) {
  return String(value || "").trim().toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function categoryFor(tags = []) {
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    const candidates = typeof tag === "string"
      ? [tag]
      : [tag?.slug, tag?.name, tag?.category].filter(Boolean);
    for (const candidate of candidates) {
      const category = CATEGORY_TAGS.get(normalizeTagSlug(candidate));
      if (category) return category;
    }
  }
  return null;
}

function finiteMetric(value) {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function readFearGreedRecord(data) {
  const item = Array.isArray(data) ? data[0] : data;
  if (!item || typeof item !== "object") return null;
  const value = finiteMetric(item.value ?? item.fear_and_greed_index);
  if (value === null) return null;
  return {
    value,
    classification: item.value_classification || item.classification || null,
    observedAt: item.update_time || item.timestamp || item.last_updated || null
  };
}

const FEAR_GREED_SUCCESS_MS = 15 * 60_000;
const FEAR_GREED_FAILURE_MS = 5 * 60_000;

function fearGreedCacheValue() {
  const entry = SERVER_CACHE.get("fear-greed");
  if (!entry) return undefined;
  if (Date.now() - entry.at > entry.expiresAfter) {
    SERVER_CACHE.delete("fear-greed");
    return undefined;
  }
  return entry.value;
}

async function optionalFearGreed() {
  const cached = fearGreedCacheValue();
  if (cached !== undefined) return cached;
  const pending = SERVER_CACHE.get("fear-greed-inflight")?.value;
  if (pending) return pending;
  const request = (async () => {
    try {
      const data = await cmc("/v3/fear-and-greed/latest", {}, 1800);
      const record = readFearGreedRecord(data);
      if (!record) throw new Error("Fear & Greed response contained no usable value");
      SERVER_CACHE.set("fear-greed", { at: Date.now(), value: record, expiresAfter: FEAR_GREED_SUCCESS_MS });
      return record;
    } catch {
      SERVER_CACHE.set("fear-greed", { at: Date.now(), value: null, expiresAfter: FEAR_GREED_FAILURE_MS });
      return null;
    } finally {
      SERVER_CACHE.delete("fear-greed-inflight");
    }
  })();
  SERVER_CACHE.set("fear-greed-inflight", { at: Date.now(), value: request });
  return request;
}

function normalizeOverview(globalData, listings, sentiment = null) {
  const quote = globalData?.quote?.USD || {};
  const assets = (listings || []).map(item => {
    const usd = quoteFor(item);
    return {
      id: String(item.id), name: item.name, symbol: item.symbol,
      price: finiteMetric(usd.price), change24h: finiteMetric(usd.percent_change_24h),
      marketCap: finiteMetric(usd.market_cap), volume24h: finiteMetric(usd.volume_24h),
      observedAt: usd.last_updated || item.last_updated || null,
      color: "#8ca2ec", peers: "No peer data", peerDelta: null, tags: item.tags || []
    };
  });
  const covered = assets.filter(item => item.change24h !== null);
  const rising = covered.filter(item => item.change24h > 0).length;
  const declining = covered.filter(item => item.change24h < 0).length;
  const flat = covered.filter(item => item.change24h === 0).length;
  const missing = assets.length - covered.length;
  const categories = new Map();
  for (const item of assets) {
    const label = categoryFor(item.tags);
    if (!label) continue;
    const row = categories.get(label) || { name: label, advancing: 0, total: 0, universe: 0 };
    row.universe += 1;
    if (item.change24h !== null) {
      row.total += 1;
      if (item.change24h > 0) row.advancing += 1;
    }
    categories.set(label, row);
  }
  for (const item of assets) {
    if (item.change24h === null) continue;
    const label = categoryFor(item.tags);
    const categoryPeers = label
      ? covered.filter(candidate => candidate.id !== item.id && categoryFor(candidate.tags) === label)
      : [];
    const cohort = categoryPeers.length
      ? categoryPeers
      : covered.filter(candidate => candidate.id !== item.id);
    if (!cohort.length) continue;
    const average = cohort.reduce((sum, candidate) => sum + candidate.change24h, 0) / cohort.length;
    item.peers = `${categoryPeers.length ? label + " mean" : "Market mean"} ${formatPercent(average)}`;
    item.peerDelta = Math.max(0, Math.min(100, Math.round(50 + (item.change24h - average) * 4)));
  }
  const normalizedCategories = [...categories.values()]
    .filter(row => row.total >= 3)
    .map(row => ({
      name: row.name,
      advancing: Math.round((row.advancing / row.total) * 100),
      advancingCount: row.advancing,
      total: row.total,
      universe: row.universe,
      missing: row.universe - row.total
    }))
    .sort((a, b) => b.advancing - a.advancing).slice(0, 5);
  const totalMarketCap = finiteMetric(quote.total_market_cap);
  return {
    mode: "live",
    retrievedAt: new Date().toISOString(),
    global: {
      marketCap: totalMarketCap,
      marketCapChange24h: finiteMetric(quote.total_market_cap_yesterday_percentage_change),
      btcDominance: finiteMetric(globalData?.btc_dominance),
      btcDominanceChange24h: finiteMetric(globalData?.btc_dominance_24h_percentage_change),
      breadth: covered.length ? Math.round((rising / covered.length) * 100) : null,
      breadthCount: rising,
      breadthDeclining: declining,
      breadthFlat: flat,
      breadthMissing: missing,
      breadthTotal: covered.length,
      breadthUniverse: assets.length,
      breadthCoverage: assets.length ? Math.round((covered.length / assets.length) * 100) : 0,
      sentiment: sentiment?.value ?? null,
      sentimentClassification: sentiment?.classification ?? null,
      sentimentObservedAt: sentiment?.observedAt ?? null
    },
    categories: normalizedCategories,
    assets: assets.slice(0, 100),
    source: { provider: "CoinMarketCap", observedAt: globalData?.last_updated || null, attribution: "Data provided by CoinMarketCap.com" }
  };
}

async function liveOverview() {
  const key = getCached("overview-v1");
  if (key) return key;
  const [globalData, listingData, sentiment] = await Promise.all([
    cmc("/v1/global-metrics/quotes/latest", { convert: "USD" }),
    cmc("/v3/cryptocurrency/listings/latest", { start: 1, limit: 100, convert: "USD", sort: "market_cap", sort_dir: "desc", aux: "tags" }),
    optionalFearGreed().catch(() => null)
  ]);
  const result = normalizeOverview(globalData, listingData, sentiment);
  setCached("overview-v1", result);
  return result;
}

async function liveAsset(id) {
  const result = await cmc("/v3/cryptocurrency/quotes/latest", { id, convert: "USD", aux: "tags" });
  const item = Array.isArray(result) ? result.find(row => String(row.id) === String(id)) || result[0] : result?.[id] || Object.values(result || {})[0];
  if (!item) return null;
  const usd = quoteFor(item);
  return {
    id: String(item.id), name: item.name, symbol: item.symbol,
    price: usd.price, change24h: usd.percent_change_24h,
    marketCap: usd.market_cap, volume24h: usd.volume_24h,
    observedAt: usd.last_updated || item.last_updated || null,
    peers: categoryFor(item.tags || []) || "market context", tags: item.tags || [], color: "#8ca2ec"
  };
}

async function liveSearch(query) {
  const q = query.toLowerCase();
  let rows = getCached("asset-map", 300_000);
  if (!rows) {
    rows = await cmc("/v1/cryptocurrency/map", { listing_status: "active", limit: 5000, aux: "first_historical_data,last_historical_data" });
    if (!Array.isArray(rows)) rows = [];
    setCached("asset-map", rows);
  }
  rows = rows.filter(row => String(row.name).toLowerCase().includes(q) || String(row.symbol).toLowerCase() === q || String(row.id) === q)
    .sort((a,b) => (String(a.symbol).toLowerCase() === q ? -1 : 0) - (String(b.symbol).toLowerCase() === q ? -1 : 0)).slice(0,8);
  if (!rows.length) return [];
  const ids = rows.map(row => row.id).filter(Number.isFinite);
  const quotes = await cmc("/v3/cryptocurrency/quotes/latest", { id: ids.join(","), convert: "USD", aux: "tags" });
  const quoteRows = Array.isArray(quotes) ? quotes : Object.values(quotes || {});
  const byId = new Map(quoteRows.map(row => [String(row.id), row]));
  return rows.map(meta => {
    const item = byId.get(String(meta.id));
    if (!item) return null;
    const usd = quoteFor(item);
    return { id: String(item.id), name: item.name, symbol: item.symbol, price: usd.price, change24h: usd.percent_change_24h, marketCap: usd.market_cap, volume24h: usd.volume_24h, observedAt: usd.last_updated || item.last_updated || null, color: "#8ca2ec", peers: categoryFor(item.tags || []) || "market context", tags: item.tags || [] };
  }).filter(Boolean);
}

async function liveHistory(id, period) {
  const days = ({ "7D": 7, "30D": 30, "90D": 90 })[period] || 7;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const payload = await cmc("/v3/cryptocurrency/quotes/historical", {
    id,
    time_start: start.toISOString(),
    time_end: end.toISOString(),
    interval: "daily",
    count: days + 1,
    convert: "USD"
  });
  const asset = payload?.[id];
  const quotes = asset?.quotes || [];
  return quotes.map(point => ({
    timestamp: point.timestamp,
    price: point.quote?.USD?.price ?? null
  })).filter(point => Number.isFinite(Number(point.price)));
}

function demoHistory(id, period) {
  const asset = demo.assets.find(item => String(item.id) === String(id)) || demo.assets.find(item => item.symbol.toLowerCase() === String(id).toLowerCase());
  if (!asset) return null;
  const count = ({ "7D": 8, "30D": 16, "90D": 24 })[period] || 8;
  const seed = [...asset.symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const wave = Math.sin((i + seed) * 0.73) * 0.035 + Math.cos((i + seed) * 0.31) * 0.022;
    const trend = (i / (count - 1) - 0.5) * (asset.change24h / 100 * (period === "7D" ? 2.2 : 4.5));
    return { timestamp: new Date(now - (count - 1 - i) * 24 * 60 * 60 * 1000).toISOString(), price: asset.price * (1 + wave + trend) };
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return reply(res, 405, { error: "METHOD_NOT_ALLOWED" }, { Allow: "GET" });
  const view = String(req.query.view || "overview");
  const apiKey = process.env.CMC_PRO_API_KEY;
  if (!apiKey) {
    const demoResponse = { ...demo, mode: "demo", source: { provider: "Demo dataset", observedAt: null, attribution: "Demo values only" } };
    if (view === "asset") {
      const sample = demoResponse.assets.find(item => String(item.id) === String(req.query.id) || item.symbol.toLowerCase() === String(req.query.id || "").toLowerCase());
      return sample ? reply(res, 200, { mode: "demo", retrievedAt: demoResponse.retrievedAt, asset: sample }) : reply(res, 404, { error: "ASSET_NOT_FOUND" });
    }
    if (view === "history") {
      const series = demoHistory(req.query.id, String(req.query.period || "7D"));
      return series ? reply(res, 200, { mode: "demo", illustrative: true, series }) : reply(res, 404, { error: "ASSET_NOT_FOUND" });
    }
    if (view === "search") {
      const q = String(req.query.q || "").trim().toLowerCase();
      return reply(res, 200, { mode: "demo", assets: demoResponse.assets.filter(item => item.name.toLowerCase().includes(q) || item.symbol.toLowerCase() === q || String(item.id) === q) });
    }
    return reply(res, 200, demoResponse);
  }

  try {
    if (view === "asset") {
      const id = String(req.query.id || "");
      if (!/^\d{1,12}$/.test(id)) return reply(res, 400, { error: "INVALID_ASSET_ID" });
      const asset = await liveAsset(id);
      return asset ? reply(res, 200, { mode: "live", retrievedAt: new Date().toISOString(), source: { provider: "CoinMarketCap", observedAt: asset.observedAt, attribution: "Data provided by CoinMarketCap.com" }, asset }) : reply(res, 404, { error: "ASSET_NOT_FOUND" });
    }
    if (view === "history") {
      const id = String(req.query.id || "");
      const period = String(req.query.period || "7D");
      if (!/^\d{1,12}$/.test(id) || !["7D", "30D", "90D"].includes(period)) return reply(res, 400, { error: "INVALID_HISTORY_QUERY" });
      const series = await liveHistory(id, period);
      return reply(res, 200, { mode: "live", retrievedAt: new Date().toISOString(), source: "CoinMarketCap historical quotes", series });
    }
    if (view === "search") {
      const q = String(req.query.q || "").trim();
      if (!/^[a-zA-Z0-9][a-zA-Z0-9 .-]{1,39}$/.test(q)) return reply(res, 400, { error: "INVALID_QUERY" });
      const assets = await liveSearch(q);
      return reply(res, 200, { mode: "live", retrievedAt: new Date().toISOString(), assets });
    }
    if (view !== "overview") return reply(res, 400, { error: "INVALID_VIEW" });
    return reply(res, 200, await liveOverview());
  } catch (error) {
    const upstreamStatus = Number(error.status || 0);
    const cmcCode = Number(error.cmcCode || 0) || null;
    if (upstreamStatus === 429 || [1008, 1009, 1010, 1011].includes(cmcCode)) return reply(res, 429, { error: "CMC_RATE_LIMITED", retryable: true, cmcCode });
    if ([1001, 1002, 1003, 1004, 1005, 1006, 1007].includes(cmcCode) || [401, 402, 403].includes(upstreamStatus)) return reply(res, 503, { error: "CMC_ENTITLEMENT_OR_KEY", retryable: false, upstreamStatus: upstreamStatus || null, cmcCode });
    if (upstreamStatus >= 500 || error.name === "TimeoutError" || error.name === "AbortError") return reply(res, 502, { error: "CMC_UPSTREAM_UNAVAILABLE", retryable: true, upstreamStatus: upstreamStatus || null });
    return reply(res, 502, { error: "CMC_UPSTREAM_ERROR", retryable: false, upstreamStatus: upstreamStatus || null, cmcCode });
  }
};
