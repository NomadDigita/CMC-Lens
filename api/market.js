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

async function cmc(path, params) {
  const url = new URL(`${CMC_ORIGIN}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": process.env.CMC_PRO_API_KEY, Accept: "application/json" },
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) {
    const error = new Error("CoinMarketCap request failed");
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  if (payload?.status?.error_code) {
    const error = new Error("CoinMarketCap returned an API error");
    error.cmcCode = payload.status.error_code;
    error.cmcMessage = payload.status.error_message;
    throw error;
  }
  return payload.data;
}

function quoteFor(item) {
  if (Array.isArray(item?.quote)) return item.quote.find(q => q.symbol === "USD") || item.quote[0] || {};
  return item?.quote?.USD || {};
}

function categoryFor(tags = []) {
  const normalized = tags.map(tag => typeof tag === "string"
    ? tag.toLowerCase()
    : `${tag?.slug || ""} ${tag?.name || ""} ${tag?.category || ""}`.toLowerCase());
  if (normalized.some(tag => /meme/.test(tag))) return "Meme";
  if (normalized.some(tag => /gaming|gamefi|play-to-earn/.test(tag))) return "Gaming";
  if (normalized.some(tag => /artificial-intelligence|ai-and-big-data|ai/.test(tag))) return "AI & Data";
  if (normalized.some(tag => /decentralized-finance|defi/.test(tag))) return "DeFi";
  if (normalized.some(tag => /layer-1|layer-2|smart-contract-platform/.test(tag))) return "Layer 1";
  return null;
}

function normalizeOverview(globalData, listings) {
  const quote = globalData?.quote?.USD || {};
  const assets = (listings || []).map(item => {
    const usd = quoteFor(item);
    return {
      id: String(item.id), name: item.name, symbol: item.symbol,
      price: usd.price, change24h: usd.percent_change_24h,
      marketCap: usd.market_cap, volume24h: usd.volume_24h,
      color: "#8ca2ec", peers: categoryFor(item.tags || []) || "market context",
      peerDelta: 50, tags: item.tags || []
    };
  });
  const peerGroups = new Map();
  assets.forEach(item => {
    const label = categoryFor(item.tags) || "Market";
    const group = peerGroups.get(label) || [];
    group.push(Number(item.change24h) || 0);
    peerGroups.set(label, group);
  });
  assets.forEach(item => {
    const label = categoryFor(item.tags) || "Market";
    const values = peerGroups.get(label) || [];
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    item.peers = `${label} mean ${average >= 0 ? "+" : ""}${average.toFixed(2)}%`;
    item.peerDelta = Math.max(8, Math.min(100, Math.round(50 + (Number(item.change24h) - average) * 4)));
  });
  const rising = assets.filter(item => Number(item.change24h) > 0).length;
  const total = assets.length;
  const categories = new Map();
  assets.forEach(item => {
    const label = categoryFor(item.tags);
    if (!label) return;
    const row = categories.get(label) || { name: label, advancing: 0, total: 0 };
    row.total += 1;
    if (Number(item.change24h) > 0) row.advancing += 1;
    categories.set(label, row);
  });
  const normalizedCategories = [...categories.values()]
    .filter(row => row.total >= 3)
    .map(row => ({ name: row.name, advancing: row.total ? Math.round((row.advancing / row.total) * 100) : 0 }))
    .sort((a,b) => b.advancing - a.advancing).slice(0,5);
  return {
    mode: "live",
    retrievedAt: new Date().toISOString(),
    global: {
      marketCap: quote.total_market_cap,
      marketCapChange24h: Number.isFinite(Number(quote.total_market_cap_yesterday_percentage_change))
        ? Number(quote.total_market_cap_yesterday_percentage_change) : null,
      btcDominance: globalData?.btc_dominance,
      btcDominanceChange24h: globalData?.btc_dominance_24h_percentage_change,
      breadth: total ? Math.round((rising / total) * 100) : null,
      breadthCount: rising,
      breadthTotal: total,
      sentiment: null
    },
    categories: normalizedCategories,
    assets: assets.slice(0, 100),
    source: { provider: "CoinMarketCap", observedAt: globalData?.last_updated || null, attribution: "Data provided by CoinMarketCap.com" }
  };
}

async function liveOverview() {
  const key = getCached("overview-v1");
  if (key) return key;
  const [globalData, listingData] = await Promise.all([
    cmc("/v1/global-metrics/quotes/latest", { convert: "USD" }),
    cmc("/v3/cryptocurrency/listings/latest", { start: 1, limit: 100, convert: "USD", sort: "market_cap", sort_dir: "desc", aux: "tags" })
  ]);
  const result = normalizeOverview(globalData, listingData);
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
    return { id: String(item.id), name: item.name, symbol: item.symbol, price: usd.price, change24h: usd.percent_change_24h, marketCap: usd.market_cap, volume24h: usd.volume_24h, color: "#8ca2ec", peers: categoryFor(item.tags || []) || "market context", tags: item.tags || [] };
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
      return asset ? reply(res, 200, { mode: "live", retrievedAt: new Date().toISOString(), source: { provider: "CoinMarketCap", attribution: "Data provided by CoinMarketCap.com" }, asset }) : reply(res, 404, { error: "ASSET_NOT_FOUND" });
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
      if (!/^[a-zA-Z0-9-]{2,20}$/.test(q)) return reply(res, 400, { error: "INVALID_QUERY" });
      const assets = await liveSearch(q);
      return reply(res, 200, { mode: "live", retrievedAt: new Date().toISOString(), assets });
    }
    if (view !== "overview") return reply(res, 400, { error: "INVALID_VIEW" });
    return reply(res, 200, await liveOverview());
  } catch (error) {
    const upstreamStatus = Number(error.status || 0);
    if (upstreamStatus === 429 || error.cmcCode === 1008) return reply(res, 429, { error: "CMC_RATE_LIMITED", retryable: true });
    if (error.cmcCode === 1006 || error.cmcCode === 1007 || upstreamStatus === 401 || upstreamStatus === 403) return reply(res, 503, { error: "CMC_ENTITLEMENT_OR_KEY", message: "The configured CMC key or plan cannot access this data." });
    if (upstreamStatus >= 500 || error.name === "TimeoutError" || error.name === "AbortError") return reply(res, 502, { error: "CMC_UPSTREAM_UNAVAILABLE", retryable: true });
    return reply(res, 502, { error: "CMC_UPSTREAM_ERROR", retryable: false });
  }
};
