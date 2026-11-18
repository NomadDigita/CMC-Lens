const demo = require("../data/demo");
const { randomUUID } = require("crypto");

const CMC_ORIGIN = "https://pro-api.coinmarketcap.com";
const SERVER_CACHE = new Map();
const CACHE_MS = 60_000;
const WINDOW_HISTORY_CACHE_MS = 10 * 60 * 1000;

async function reserveSharedWindowHistoryBudget(token, credits) {
  let base=String(process.env.SUPABASE_URL||"");
  while(base.endsWith("/"))base=base.slice(0,-1);
  const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!base||!publishableKey)return {error:"CMC_HISTORY_BUDGET_UNAVAILABLE"};
  try{
    const response=await fetch(base+"/functions/v1/reserve-cmc-history",{
      method:"POST",
      headers:{apikey:publishableKey,Authorization:"Bearer "+token,"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({credits}),
      signal:AbortSignal.timeout(6500)
    });
    const payload=await response.json().catch(()=>({}));
    if(response.status===401||response.status===403)return {error:"CMC_HISTORY_AUTH_REQUIRED"};
    if(!response.ok)return {error:"CMC_HISTORY_BUDGET_UNAVAILABLE"};
    return {allowed:payload.allowed===true,retryAfterSeconds:Number(payload.retryAfterSeconds)||0,error:payload.error||null};
  }catch{return {error:"CMC_HISTORY_BUDGET_UNAVAILABLE"};}
}

function reply(res, status, body, headers = {}) {
  if (Array.isArray(body?.sourceReceipts)) {
    const servedAt = new Date().toISOString();
    body = { ...body, sourceReceipts: body.sourceReceipts.map(receipt => ({
      ...receipt,
      appCache: { ...receipt.appCache, servedAt }
    })) };
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const hasReceipts=Array.isArray(body?.sourceReceipts)&&body.sourceReceipts.length>0;
  res.setHeader("Cache-Control", hasReceipts ? "private, no-store" : status < 400 ? "s-maxage=60, stale-while-revalidate=300" : "no-store");
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

function safeReceiptParams(params={}){
  const allowed=new Set(["convert","start","limit","sort","sort_dir","aux","id","listing_status","time_start","time_end","interval","count","skip_invalid"]);
  return Object.fromEntries(Object.entries(params).filter(([key,value])=>allowed.has(key)&&value!==undefined&&value!==null&&value!=="").map(([key,value])=>[key,String(value).slice(0,120)]));
}

function receiptRows(data){
  if(Array.isArray(data))return data;
  if(data&&typeof data==="object")return Object.values(data);
  return [];
}

function sourceObservedAt(path,data){
  if(path==="/v1/global-metrics/quotes/latest")return data?.last_updated||null;
  if(path==="/v3/fear-and-greed/latest"){const row=Array.isArray(data)?data[0]:data;return row?.update_time||row?.timestamp||row?.last_updated||null;}
  if(path==="/v3/cryptocurrency/quotes/historical"){const rows=receiptRows(data);const quotes=rows.flatMap(row=>row?.quotes||[]);return quotes.at(-1)?.timestamp||null;}
  const rows=receiptRows(data);const first=rows[0];
  return quoteFor(first)?.last_updated||first?.last_updated||null;
}

function responseSummary(path,data){
  const rows=receiptRows(data);
  if(path==="/v1/global-metrics/quotes/latest")return {totalMarketCap:finiteMetric(data?.quote?.USD?.total_market_cap),btcDominance:finiteMetric(data?.btc_dominance)};
  if(path==="/v3/fear-and-greed/latest"){const row=Array.isArray(data)?data[0]:data;return {value:finiteMetric(row?.value??row?.fear_and_greed_index),classification:row?.value_classification||row?.classification||null};}
  if(path==="/v3/cryptocurrency/quotes/historical"){const points=rows.flatMap(row=>row?.quotes||[]);return {points:points.length,firstTimestamp:points[0]?.timestamp||null,lastTimestamp:points.at(-1)?.timestamp||null};}
  if(path==="/v3/cryptocurrency/quotes/latest")return {matchedAssets:rows.length,assets:rows.slice(0,5).map(row=>({id:String(row.id||""),symbol:row.symbol||"",price:finiteMetric(quoteFor(row).price),change24h:finiteMetric(quoteFor(row).percent_change_24h)}))};
  if(path==="/v3/cryptocurrency/listings/latest")return {returnedAssets:rows.length,assets:rows.slice(0,5).map(row=>({id:String(row.id||""),symbol:row.symbol||""}))};
  if(path==="/v1/cryptocurrency/map")return {matchedAssets:rows.length,assets:rows.slice(0,5).map(row=>({id:String(row.id||""),symbol:row.symbol||""}))};
  return {returnedRecords:rows.length};
}

function makeSourceReceipt(path,params,{upstreamStatus=null,data=null,error=null}={}){
  const servedAt=new Date().toISOString();
  const cmcCode=Number(error?.cmcCode||0)||null;
  return {requestId:randomUUID(),provider:"CoinMarketCap",method:"GET",endpoint:path,params:safeReceiptParams(params),outcome:error?(upstreamStatus>=500||error.name==="TimeoutError"||error.name==="AbortError"?"unavailable":"error"):"success",upstreamStatus,errorCode:error?(cmcCode?`CMC_${cmcCode}`:upstreamStatus?`HTTP_${upstreamStatus}`:error.name==="TimeoutError"?"TIMEOUT":"NETWORK_ERROR"):null,appCache:{status:"miss",servedAt,sourceRetrievedAt:servedAt},sourceObservedAt:error?null:sourceObservedAt(path,data),recordCount:error?null:(path==="/v3/cryptocurrency/quotes/historical"?responseSummary(path,data).points:["/v1/global-metrics/quotes/latest","/v3/fear-and-greed/latest"].includes(path)?(data==null?0:Array.isArray(data)?data.length:1):receiptRows(data).length),responseSummary:error?{}:responseSummary(path,data)};
}

function cachedSourceReceipts(receipts=[]){
  const servedAt=new Date().toISOString();
  return receipts.map(receipt=>({...receipt,appCache:{...receipt.appCache,status:"hit",servedAt,sourceRetrievedAt:receipt.appCache?.sourceRetrievedAt||receipt.appCache?.servedAt||null}}));
}

async function cmc(path, params, timeoutMs = 9000, receiptSink = []) {
  const safeParams=safeReceiptParams(params);
  const url = new URL(`${CMC_ORIGIN}${path}`);
  Object.entries(safeParams).forEach(([key, value]) => url.searchParams.set(key, value));
  let upstreamStatus=null;
  try{
    const response = await fetch(url, {headers: { "X-CMC_PRO_API_KEY": process.env.CMC_PRO_API_KEY, Accept: "application/json" },signal: AbortSignal.timeout(timeoutMs)});
    upstreamStatus=response.status;
    const payload = await response.json();
    const cmcCode = Number(payload?.status?.error_code ?? 0);
    if (!response.ok || (Number.isFinite(cmcCode) && cmcCode !== 0)) {
      const error = new Error("CoinMarketCap request failed");
      error.status = response.status;
      error.cmcCode = Number.isFinite(cmcCode) && cmcCode !== 0 ? cmcCode : undefined;
      error.cmcMessage = payload?.status?.error_message;
      throw error;
    }
    const data=payload.data;
    receiptSink.push(makeSourceReceipt(path,safeParams,{upstreamStatus,data}));
    return data;
  }catch(error){
    receiptSink.push(makeSourceReceipt(path,safeParams,{upstreamStatus:upstreamStatus||error.status||null,error}));
    throw error;
  }
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

async function optionalFearGreed(receiptSink=[]) {
  const entry = SERVER_CACHE.get("fear-greed");
  if (entry && Date.now() - entry.at <= entry.expiresAfter) {
    if (entry.receipt) receiptSink.push(...cachedSourceReceipts([entry.receipt]));
    return entry.value;
  }
  if (entry) SERVER_CACHE.delete("fear-greed");
  const pending = SERVER_CACHE.get("fear-greed-inflight")?.value;
  if (pending) {
    const shared = await pending;
    if (shared.receipt) receiptSink.push(...cachedSourceReceipts([shared.receipt]));
    return shared.value;
  }
  const request = (async () => {
    const receipts=[];
    try {
      const data = await cmc("/v3/fear-and-greed/latest", {}, 1800, receipts);
      const record = readFearGreedRecord(data);
      if (!record) throw new Error("Fear & Greed response contained no usable value");
      const receipt=receipts[0]||null;
      SERVER_CACHE.set("fear-greed", { at: Date.now(), value: record, receipt, expiresAfter: FEAR_GREED_SUCCESS_MS });
      return {value:record,receipt};
    } catch {
      const receipt=receipts[0]||null;
      SERVER_CACHE.set("fear-greed", { at: Date.now(), value: null, receipt, expiresAfter: FEAR_GREED_FAILURE_MS });
      return {value:null,receipt};
    } finally {
      SERVER_CACHE.delete("fear-greed-inflight");
    }
  })();
  SERVER_CACHE.set("fear-greed-inflight", { at: Date.now(), value: request });
  const result=await request;
  if (result.receipt) receiptSink.push(result.receipt);
  return result.value;
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

async function liveOverview(receiptSink=[]) {
  const cached = getCached("overview-v1");
  if (cached) {
    const receipts=cachedSourceReceipts(cached.sourceReceipts||[]);
    receiptSink.push(...receipts);
    return {...cached,sourceReceipts:receipts};
  }
  const sourceReceipts=[];
  const [globalData, listingData, sentiment] = await Promise.all([
    cmc("/v1/global-metrics/quotes/latest", { convert: "USD" }, 9000, sourceReceipts),
    cmc("/v3/cryptocurrency/listings/latest", { start: 1, limit: 100, convert: "USD", sort: "market_cap", sort_dir: "desc", aux: "tags" }, 9000, sourceReceipts),
    optionalFearGreed(sourceReceipts).catch(() => null)
  ]);
  const result = normalizeOverview(globalData, listingData, sentiment);
  result.sourceReceipts=sourceReceipts;
  receiptSink.push(...sourceReceipts);
  setCached("overview-v1", result);
  return result;
}

async function liveAsset(id, receiptSink=[]) {
  const result = await cmc("/v3/cryptocurrency/quotes/latest", { id, convert: "USD", aux: "tags" }, 9000, receiptSink);
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

async function liveSearch(query, receiptSink=[]) {
  const q = query.toLowerCase();
  let rows = getCached("asset-map", 300_000);
  if (!rows) {
    const mapReceipts=[];
    rows = await cmc("/v1/cryptocurrency/map", { listing_status: "active", limit: 5000, aux: "first_historical_data,last_historical_data" }, 9000, mapReceipts);
    if (!Array.isArray(rows)) rows = [];
    setCached("asset-map", rows);
    if (mapReceipts[0]) setCached("asset-map-receipt",mapReceipts[0]);
    receiptSink.push(...mapReceipts);
  } else {
    const cachedReceipt=getCached("asset-map-receipt",300_000);
    if(cachedReceipt)receiptSink.push(...cachedSourceReceipts([cachedReceipt]));
  }
  rows = rows.filter(row => String(row.name).toLowerCase().includes(q) || String(row.symbol).toLowerCase() === q || String(row.id) === q)
    .sort((a,b) => (String(a.symbol).toLowerCase() === q ? -1 : 0) - (String(b.symbol).toLowerCase() === q ? -1 : 0)).slice(0,8);
  if (!rows.length) return [];
  const ids = rows.map(row => row.id).filter(Number.isFinite);
  const quotes = await cmc("/v3/cryptocurrency/quotes/latest", { id: ids.join(","), convert: "USD", aux: "tags" }, 9000, receiptSink);
  const quoteRows = Array.isArray(quotes) ? quotes : Object.values(quotes || {});
  const byId = new Map(quoteRows.map(row => [String(row.id), row]));
  return rows.map(meta => {
    const item = byId.get(String(meta.id));
    if (!item) return null;
    const usd = quoteFor(item);
    return { id: String(item.id), name: item.name, symbol: item.symbol, price: usd.price, change24h: usd.percent_change_24h, marketCap: usd.market_cap, volume24h: usd.volume_24h, observedAt: usd.last_updated || item.last_updated || null, color: "#8ca2ec", peers: categoryFor(item.tags || []) || "market context", tags: item.tags || [] };
  }).filter(Boolean);
}

async function liveHistory(id, period, receiptSink=[]) {
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
  }, 9000, receiptSink);
  const asset = payload?.[id];
  const quotes = asset?.quotes || [];
  return quotes.map(point => ({
    timestamp: point.timestamp,
    price: point.quote?.USD?.price ?? null
  })).filter(point => Number.isFinite(Number(point.price)));
}
async function liveWindowHistory(ids, timeStart, timeEnd, receiptSink=[]) {
  const payload=await cmc("/v3/cryptocurrency/quotes/historical",{
    id:ids.join(","),
    time_start:timeStart,
    time_end:timeEnd,
    interval:"24h",
    aux:"search_interval",
    convert:"USD",
    skip_invalid:"true"
  },12000,receiptSink);
  const result={};
  for(const id of ids){
    const asset=payload?.[id];
    const quotes=Array.isArray(asset?.quotes)?asset.quotes:[];
    result[id]=quotes.map(point=>{
      const usd=point?.quote?.USD||{};
      const timestamp=point?.search_interval||point?.quote?.search_interval||point?.timestamp||usd.search_interval||usd.timestamp||null;
      const price=finiteMetric(usd.price);
      return timestamp&&price!==null?{timestamp,price,observedAt:usd.timestamp||point.timestamp||null}:null;
    }).filter(Boolean);
  }
  return result;
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
    const demoResponse = { ...demo, mode: "demo", source: { provider: "Demo dataset", observedAt: null, attribution: "Demo values only" }, sourceReceipts: [] };
    if (view === "asset") {
      const sample = demoResponse.assets.find(item => String(item.id) === String(req.query.id) || item.symbol.toLowerCase() === String(req.query.id || "").toLowerCase());
      return sample ? reply(res, 200, { mode: "demo", retrievedAt: demoResponse.retrievedAt, asset: sample, sourceReceipts: [] }) : reply(res, 404, { error: "ASSET_NOT_FOUND" });
    }
    if (view === "history") {
      const series = demoHistory(req.query.id, String(req.query.period || "7D"));
      return series ? reply(res, 200, { mode: "demo", illustrative: true, series, sourceReceipts: [] }) : reply(res, 404, { error: "ASSET_NOT_FOUND" });
    }
    if (view === "window-history") return reply(res, 200, { mode: "demo", series: {}, sourceReceipts: [] });
    if (view === "search") {
      const q = String(req.query.q || "").trim().toLowerCase();
      return reply(res, 200, { mode: "demo", assets: demoResponse.assets.filter(item => item.name.toLowerCase().includes(q) || item.symbol.toLowerCase() === q || String(item.id) === q), sourceReceipts: [] });
    }
    return reply(res, 200, demoResponse);
  }

  const sourceReceipts=[];
  try {
    if (view === "asset") {
      const id = String(req.query.id || "");
      if (!/^\d{1,12}$/.test(id)) return reply(res, 400, { error: "INVALID_ASSET_ID", sourceReceipts });
      const asset = await liveAsset(id, sourceReceipts);
      return asset ? reply(res, 200, { mode: "live", retrievedAt: new Date().toISOString(), source: { provider: "CoinMarketCap", observedAt: asset.observedAt, attribution: "Data provided by CoinMarketCap.com" }, asset, sourceReceipts }) : reply(res, 404, { error: "ASSET_NOT_FOUND", sourceReceipts });
    }
    if (view === "history") {
      const id = String(req.query.id || "");
      const period = String(req.query.period || "7D");
      if (!/^\d{1,12}$/.test(id) || !["7D", "30D", "90D"].includes(period)) return reply(res, 400, { error: "INVALID_HISTORY_QUERY", sourceReceipts });
      const series = await liveHistory(id, period, sourceReceipts);
      return reply(res, 200, { mode: "live", retrievedAt: new Date().toISOString(), source: "CoinMarketCap historical quotes", series, sourceReceipts });
    }
    if (view === "search") {
      const q = String(req.query.q || "").trim();
      if (!/^[a-zA-Z0-9][a-zA-Z0-9 .-]{1,39}$/.test(q)) return reply(res, 400, { error: "INVALID_QUERY", sourceReceipts });
      const assets = await liveSearch(q, sourceReceipts);
      return reply(res, 200, { mode: "live", retrievedAt: new Date().toISOString(), assets, sourceReceipts });
    }
    if (view === "window-history") {
      const ids=String(req.query.ids||"").split(",").filter(Boolean);
      const timeStart=String(req.query.start||"");
      const timeEnd=String(req.query.end||"");
      const startDate=new Date(timeStart),endDate=new Date(timeEnd),now=Date.now();
      if(ids.length<2||ids.length>8||ids.some(id=>!/^\d{1,12}$/.test(id))||new Set(ids).size!==ids.length)return reply(res,400,{error:"INVALID_WINDOW_ASSETS",sourceReceipts});
      if(!Number.isFinite(startDate.getTime())||!Number.isFinite(endDate.getTime())||startDate>=endDate||endDate.getTime()>now+60_000)return reply(res,400,{error:"INVALID_WINDOW",sourceReceipts});
      if((endDate-startDate)>366*24*60*60*1000)return reply(res,400,{error:"WINDOW_TOO_WIDE",sourceReceipts});
      const canonicalIds=[...ids].sort();
      const startIso=startDate.toISOString(),endIso=endDate.toISOString();
      const authParts=String(req.headers?.authorization||"").trim().split(/\s+/);
      const token=authParts[0]?.toLowerCase()==="bearer"?authParts.slice(1).join(" "):null;
      if(!token)return reply(res,401,{error:"CMC_HISTORY_AUTH_REQUIRED",sourceReceipts});
      const cacheEndIso=new Date(Math.floor(endDate.getTime()/WINDOW_HISTORY_CACHE_MS)*WINDOW_HISTORY_CACHE_MS).toISOString();
      const cacheKey="window-history:"+canonicalIds.join(",")+":"+startIso+":"+cacheEndIso;
      const cached=getCached(cacheKey,WINDOW_HISTORY_CACHE_MS);
      if(cached){
        sourceReceipts.push(...cachedSourceReceipts(cached.sourceReceipts));
        return reply(res,200,{mode:"live",retrievedAt:new Date().toISOString(),source:{provider:"CoinMarketCap",endpoint:"/v3/cryptocurrency/quotes/historical",interval:"24h",cache:"hit"},timeStart:startIso,timeEnd:endIso,series:cached.series,sourceReceipts});
      }
      const requestedDays=Math.ceil((endDate-startDate)/(24*60*60*1000))+1;
      const estimatedCredits=Math.max(1,Math.ceil(requestedDays*canonicalIds.length/100));
      const budget=await reserveSharedWindowHistoryBudget(token,estimatedCredits);
      if(budget.error==="CMC_HISTORY_AUTH_REQUIRED")return reply(res,401,{error:budget.error,sourceReceipts});
      if(budget.error)return reply(res,503,{error:"CMC_HISTORY_BUDGET_UNAVAILABLE",retryable:true,sourceReceipts});
      if(!budget.allowed)return reply(res,429,{error:"CMC_HISTORY_BUDGET_EXHAUSTED",retryable:true,retryAfterSeconds:budget.retryAfterSeconds,sourceReceipts},{"Retry-After":String(budget.retryAfterSeconds)});
      const series=await liveWindowHistory(canonicalIds,startIso,endIso,sourceReceipts);
      setCached(cacheKey,{series,sourceReceipts});
      return reply(res,200,{mode:"live",retrievedAt:new Date().toISOString(),source:{provider:"CoinMarketCap",endpoint:"/v3/cryptocurrency/quotes/historical",interval:"24h",cache:"miss"},timeStart:startIso,timeEnd:endIso,series,sourceReceipts});
    }
    if (view !== "overview") return reply(res, 400, { error: "INVALID_VIEW", sourceReceipts });
    return reply(res, 200, await liveOverview(sourceReceipts));
  } catch (error) {
    const upstreamStatus = Number(error.status || 0);
    const cmcCode = Number(error.cmcCode || 0) || null;
    if (upstreamStatus === 429 || [1008, 1009, 1010, 1011].includes(cmcCode)) return reply(res, 429, { error: "CMC_RATE_LIMITED", retryable: true, cmcCode, sourceReceipts });
    if ([1001, 1002, 1003, 1004, 1005, 1006, 1007].includes(cmcCode) || [401, 402, 403].includes(upstreamStatus)) return reply(res, 503, { error: "CMC_ENTITLEMENT_OR_KEY", retryable: false, upstreamStatus: upstreamStatus || null, cmcCode, sourceReceipts });
    if (upstreamStatus >= 500 || error.name === "TimeoutError" || error.name === "AbortError") return reply(res, 502, { error: "CMC_UPSTREAM_UNAVAILABLE", retryable: true, upstreamStatus: upstreamStatus || null, sourceReceipts });
    return reply(res, 502, { error: "CMC_UPSTREAM_ERROR", retryable: false, upstreamStatus: upstreamStatus || null, cmcCode, sourceReceipts });
  }
};
