const demoData = {
  mode: "demo",
  retrievedAt: "2026-11-18T13:30:00.000Z",
  global: { marketCap: 2.48e12, marketCapChange24h: 2.84, btcDominance: 54.8, btcDominanceChange24h: -0.36, breadth: 75, breadthCount: 6, breadthDeclining: 2, breadthFlat: 0, breadthMissing: 0, breadthTotal: 8, breadthUniverse: 8, breadthCoverage: 100, sentiment: 62, sentimentClassification: "Mixed sentiment", sentimentSource: "Illustrative demo" },
  categories: [
    { name: "Layer 1", advancing: 82 }, { name: "DeFi", advancing: 74 }, { name: "AI & Data", advancing: 61 }, { name: "Gaming", advancing: 53 }, { name: "Meme", advancing: 39 }
  ],
  assets: [
    { id: "1", name: "Bitcoin", symbol: "BTC", tags: ["layer-1"], category: "Layer 1", price: 68342.18, change24h: 3.1, marketCap: 1.35e12, volume24h: 31.6e9, color: "#f3a94b", peers: "market +2.8%", peerDelta: 71, note: "Outperforming a positive market" },
    { id: "1027", name: "Ethereum", symbol: "ETH", tags: ["layer-1"], category: "Layer 1", price: 3544.92, change24h: 1.42, marketCap: 426.3e9, volume24h: 14.9e9, color: "#859af2", peers: "L1 peers +2.1%", peerDelta: 46, note: "Trailing its peer group" },
    { id: "5426", name: "Solana", symbol: "SOL", tags: ["layer-1"], category: "Layer 1", price: 178.64, change24h: 6.82, marketCap: 79.2e9, volume24h: 3.7e9, color: "#8fe7bb", peers: "L1 peers +2.1%", peerDelta: 94, note: "Move is broader than L1 peers" },
    { id: "3408", name: "USD Coin", symbol: "USDC", tags: ["stablecoin"], category: "Stablecoins", price: 1.0001, change24h: 0.02, marketCap: 33.8e9, volume24h: 4.8e9, color: "#6a9bf0", peers: "stablecoin range", peerDelta: 12, note: "Within its usual narrow range" },
    { id: "825", name: "Tether", symbol: "USDT", tags: ["stablecoin"], category: "Stablecoins", price: 0.9998, change24h: -0.01, marketCap: 118.4e9, volume24h: 47.2e9, color: "#55bf9b", peers: "stablecoin range", peerDelta: 10, note: "Within its usual narrow range" },
    { id: "1975", name: "Chainlink", symbol: "LINK", tags: ["smart-contracts"], category: "Smart contracts", price: 18.24, change24h: 4.37, marketCap: 10.7e9, volume24h: 0.42e9, color: "#719cf5", peers: "Infra peers +2.7%", peerDelta: 79, note: "Outperforming infrastructure peers" },
    { id: "52", name: "XRP", symbol: "XRP", tags: ["layer-1"], category: "Layer 1", price: 0.6241, change24h: -2.46, marketCap: 34.1e9, volume24h: 1.23e9, color: "#90a3b7", peers: "large caps +2.5%", peerDelta: 21, note: "Moving against large-cap peers" },
    { id: "74", name: "Dogecoin", symbol: "DOGE", tags: ["meme"], category: "Meme", price: 0.163, change24h: 8.25, marketCap: 23.5e9, volume24h: 1.62e9, color: "#d2b156", peers: "meme assets +1.7%", peerDelta: 97, note: "Strong move within a volatile category" }
  ]
};

const state = {
  data: demoData,
  latestSourceReceipts: [],
  view: "pulse",
  theses: startupTheses(),
  activeFilter: "all",
  comparePeriod: "7D",
  compareSymbols: ["BTC", "ETH", "SOL"], compareAssetCache: {},
  comparePickerOpen: false,
  comparePickerQuery: "",
  historicalCache: {},
  historyPending: {},
  atlas: { category: "all", cap: "all", hideStablecoins: true, mode: "map", selected: [], activeId: null },
  currentAsset: null,
  auth: { configured: false, url: null, publishableKey: null, session: null, user: null, pendingEmail: null, syncing: false, syncRequested: false, syncEpoch: 0, sessionEpoch: 0, syncJob: null }
};

function loadTheses(key = "cmc-lens-theses") {
  try { const rows = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(rows) ? rows : []; }
  catch { return []; }
}
function activeThesesKey() { return state.auth.user ? `cmc-lens-theses:${state.auth.user.id}` : "cmc-lens-theses"; }
function startupTheses() { return localStorage.getItem("cmc-lens-session") ? [] : loadTheses(); }
function saveTheses(sync = true) {
  localStorage.setItem(activeThesesKey(), JSON.stringify(state.theses));
  if (sync && state.auth.user) syncWorkspace().catch(() => updateStorageStatus("Saved locally · cloud sync will retry"));
}
function money(n, digits = 2) {
  if (n === null || n === undefined || n === "" || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(digits > 1 ? 2 : 1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1) return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
  return `$${v.toFixed(4)}`;
}
function fmtPercent(v, plus = true) { const n = Number(v); return `${plus && n > 0 ? "+" : ""}${n.toFixed(2)}%`; }
function hasNumericValue(v) { return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)); }
function fmtOptionalPercent(v, plus = true) { return hasNumericValue(v) ? fmtPercent(Number(v), plus) : "—"; }
function escapeHtml(s = "") { return String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
function safeDate(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "Not set" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function assetBySymbol(symbol) { return state.data.assets.find(a => a.symbol === symbol) || demoData.assets.find(a => a.symbol === symbol); }
function amountLabel(n) { return money(n, 1); }

function sparkline() {
  const points = [76,72,74,67,69,60,62,54,59,49,55,48,51,40,44,38,42,30,33,27,32,19,23,14];
  const coords = points.map((y, i) => `${(i / (points.length - 1)) * 100},${y}`).join(" ");
  document.getElementById("market-sparkline").innerHTML = `<svg viewBox="0 0 100 82" preserveAspectRatio="none"><defs><linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--lime)" stop-opacity=".18"/><stop offset="1" stop-color="var(--lime)" stop-opacity="0"/></linearGradient></defs><polygon points="0,82 ${coords} 100,82" fill="url(#spark-fill)"/><polyline points="${coords}" fill="none" stroke="var(--lime)" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderCategoryChart() {
  const host = document.getElementById("category-chart");
  if (!state.data.categories.length) { host.innerHTML = `<div class="category-empty">Category coverage is not available in this data response.</div>`; return; }
  host.innerHTML = state.data.categories.map(c => `<div class="cat-row"><span class="cat-name">${escapeHtml(c.name)}</span><div class="cat-track"><i style="--width:${Math.max(0, Math.min(100, c.advancing))}%"></i></div><span class="cat-value">${Math.round(c.advancing)}%</span></div>`).join("");
  host.querySelectorAll(".cat-row").forEach((row,i)=>{const c=state.data.categories[i]||{};row.title=hasNumericValue(c.total)&&hasNumericValue(c.universe)?"Covered "+c.total+" of "+c.universe+"; missing "+(c.missing??Math.max(0,c.universe-c.total)):state.data.mode==="demo"?"Illustrative demo category sample; coverage denominator not supplied":"Category coverage unavailable";});
}

function renderMovements() {
  const rows = [...state.data.assets].filter(a => a.symbol !== "USDC" && a.symbol !== "USDT").sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 4);
  document.getElementById("movement-list").innerHTML = rows.map(a => `<div class="movement-row" data-asset="${escapeHtml(a.symbol)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(a.name)} research"><div class="asset-cell"><span class="coin-icon" style="--coin-bg:${a.color}20;--coin-fg:${a.color}">${escapeHtml(a.symbol.slice(0, 1))}</span><span class="asset-name-wrap"><span class="asset-name">${escapeHtml(a.name)}</span><small class="asset-symbol">${escapeHtml(a.symbol)}</small></span></div><span class="move-value ${hasNumericValue(a.change24h) ? (Number(a.change24h) >= 0 ? "up" : "down") : ""}">${fmtOptionalPercent(a.change24h)}</span><span class="peer-context"><span class="peer-bar"><i style="--peer:${a.peerDelta}%"></i></span><span class="peer-text">${escapeHtml(a.peers)}</span></span><span class="row-arrow">↗</span></div>`).join("");
  document.querySelectorAll(".movement-row").forEach(el => {
    el.addEventListener("click", () => showAsset(el.dataset.asset));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showAsset(el.dataset.asset); } });
  });
}

function statusLabel(t) { const due = t.reviewAt && new Date(t.reviewAt) <= new Date(); return t.status === "reviewed" ? "Reviewed" : due ? "Ready to review" : "Open"; }
function renderThesisCards() {
  const host = document.getElementById("thesis-list");
  const latest = [...state.theses].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  if (!latest.length) host.innerHTML = `<div class="empty-theses">Nothing in the log yet.<br />Start with a question you want to revisit.</div>`;
  else host.innerHTML = latest.map(t => `<article class="thesis-item" data-thesis="${t.id}" tabindex="0"><div class="thesis-item-top"><strong class="thesis-title">${escapeHtml(t.title)}</strong><span class="thesis-status">${escapeHtml(statusLabel(t))}</span></div><div class="thesis-meta"><span>${escapeHtml(t.assetSymbol || "Market")}</span><i class="tiny-dot blue"></i><span>Logged ${safeDate(t.createdAt)}</span></div><div class="thesis-evidence"><span>▧</span>${(t.evidence || []).length} evidence items · Review ${safeDate(t.reviewAt)}</div></article>`).join("");
  host.querySelectorAll("[data-thesis]").forEach(el => el.addEventListener("click", () => showThesis(el.dataset.thesis)));
  const open = state.theses.filter(t => t.status !== "reviewed").length;
  const review = state.theses.filter(t => t.status !== "reviewed" && new Date(t.reviewAt) <= new Date()).length;
  ["thesis-count","filter-all-count"].forEach(id => document.getElementById(id).textContent = String(state.theses.length));
  document.getElementById("open-count").textContent = String(open);
  document.getElementById("review-count").textContent = String(review);
  document.getElementById("filter-open-count").textContent = String(open);
  document.getElementById("filter-review-count").textContent = String(review);
  document.getElementById("filter-reviewed-count").textContent = String(state.theses.filter(t => t.status === "reviewed").length);
  renderThesesPage();
}

function renderThesesPage() {
  const list = [...state.theses].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).filter(t => {
    if (state.activeFilter === "open") return t.status !== "reviewed" && new Date(t.reviewAt) > new Date();
    if (state.activeFilter === "review") return t.status !== "reviewed" && new Date(t.reviewAt) <= new Date();
    if (state.activeFilter === "reviewed") return t.status === "reviewed";
    return true;
  });
  const host = document.getElementById("theses-page-list");
  if (!list.length) { host.innerHTML = `<div class="empty-theses">${state.activeFilter === "all" ? "Your research log is ready for its first question." : "No theses in this view yet."}</div>`; return; }
  host.innerHTML = list.map(t => `<article class="thesis-row" data-thesis="${t.id}" tabindex="0"><div><div class="thesis-row-title">${escapeHtml(t.title)}</div><div class="thesis-row-sub"><span>${escapeHtml(t.assetSymbol || "Market")}</span><span>·</span><span>Created ${safeDate(t.createdAt)}</span><span>·</span><span>${(t.evidence || []).length} evidence items</span></div></div><div class="thesis-column"><span class="thesis-row-label">REVIEW DATE</span><strong>${safeDate(t.reviewAt)}</strong></div><div class="thesis-column"><span class="thesis-row-label">STATUS</span><span class="thesis-row-state">${escapeHtml(statusLabel(t))}</span></div></article>`).join("");
  host.querySelectorAll("[data-thesis]").forEach(el => el.addEventListener("click", () => showThesis(el.dataset.thesis)));
}

function setConnection(mode, timestamp) {
  const connected = mode === "live";
  const title = document.getElementById("connection-title");
  const note = document.getElementById("connection-note");
  const banner = document.getElementById("demo-banner");
  const api = document.getElementById("api-connection");
  const stateLabel = document.getElementById("footer-data-state");
  api.classList.toggle("is-live", connected);
  if (connected) {
    title.textContent = "CMC live data";
    note.textContent = timestamp ? `Updated ${new Date(timestamp).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}` : "Live API connected";
    banner.hidden = true;
    stateLabel.textContent = "· live CMC data";
  } else {
    title.textContent = "Demo environment";
    note.textContent = "Sample values · not live";
    banner.hidden = false;
    stateLabel.textContent = "· demo values";
  }
  const settings = document.getElementById("settings-data-status");
  const settingsBadge = document.getElementById("settings-data-badge");
  if (settings) settings.textContent = connected ? "Live data is coming from the CoinMarketCap API." : "Sample data is active. Live data is not connected.";
  if (settingsBadge) {
    settingsBadge.textContent = connected ? "LIVE" : "DEMO";
    settingsBadge.classList.toggle("live-status", connected);
    settingsBadge.classList.toggle("demo-status", !connected);
  }
}

function render() {
  const g = state.data.global || demoData.global;
  document.getElementById("market-cap").innerHTML = g.marketCap !== null && g.marketCap !== undefined && Number.isFinite(Number(g.marketCap)) ? `${money(g.marketCap).replace("$", "$").replace(/[TB]$/, "")}<span>${g.marketCap >= 1e12 ? "T" : "B"}</span>` : "—";
  const capChange = document.getElementById("market-cap-change");
  const capChangeAvailable = g.marketCapChange24h !== null && g.marketCapChange24h !== undefined && Number.isFinite(Number(g.marketCapChange24h));
  capChange.className = `metric-change ${capChangeAvailable ? (g.marketCapChange24h >= 0 ? "up" : "down") : ""}`;
  capChange.innerHTML = capChangeAvailable ? `<span>${g.marketCapChange24h >= 0 ? "↗" : "↘"}</span> ${fmtPercent(g.marketCapChange24h)}` : "24h change unavailable";
  document.getElementById("btc-dominance").innerHTML = g.btcDominance !== null && g.btcDominance !== undefined && Number.isFinite(Number(g.btcDominance)) ? `${Number(g.btcDominance).toFixed(1)}<span>%</span>` : "—";
  const btc = document.getElementById("btc-change");
  const btcChangeAvailable = g.btcDominanceChange24h !== null && g.btcDominanceChange24h !== undefined && Number.isFinite(Number(g.btcDominanceChange24h));
  btc.className = `metric-change ${btcChangeAvailable ? (g.btcDominanceChange24h >= 0 ? "up" : "down") : ""}`;
  btc.innerHTML = btcChangeAvailable ? `<span>${g.btcDominanceChange24h >= 0 ? "↗" : "↘"}</span> ${fmtPercent(g.btcDominanceChange24h)}` : "24h change unavailable";
  const breadthAvailable = hasNumericValue(g.breadth);
  const breadthTotal = hasNumericValue(g.breadthTotal) ? Number(g.breadthTotal) : state.data.assets.filter(a=>hasNumericValue(a.change24h)).length;
  const breadthCount = hasNumericValue(g.breadthCount) ? Number(g.breadthCount) : state.data.assets.filter(a=>hasNumericValue(a.change24h)&&Number(a.change24h)>0).length;
  const declining = hasNumericValue(g.breadthDeclining) ? Number(g.breadthDeclining) : null;
  const flat = Object.prototype.hasOwnProperty.call(g,"breadthFlat") ? (hasNumericValue(g.breadthFlat)?Number(g.breadthFlat):null) : (declining!==null&&breadthTotal>=breadthCount+declining?breadthTotal-breadthCount-declining:null);
  const universe = hasNumericValue(g.breadthUniverse) ? Number(g.breadthUniverse) : breadthTotal;
  const missing = Object.prototype.hasOwnProperty.call(g,"breadthMissing") ? (hasNumericValue(g.breadthMissing)?Number(g.breadthMissing):null) : (hasNumericValue(g.breadthUniverse)&&hasNumericValue(g.breadthTotal)?Math.max(0,universe-breadthTotal):null);
  const coverage = hasNumericValue(g.breadthCoverage) ? Number(g.breadthCoverage) : (universe>0?breadthTotal/universe*100:null);
  document.getElementById("breadth-value").textContent = breadthAvailable ? String(breadthCount) : "—";
  document.getElementById("breadth-total").textContent = String(breadthTotal);
  const breadthLegend=document.querySelector(".breadth-legend");
  if(breadthLegend)breadthLegend.innerHTML="<span>Advancing <b>"+breadthCount+"</b></span><span>Declining <b>"+(declining===null?"—":declining)+"</b></span><span>Flat <b>"+(flat===null?"—":flat)+"</b></span><span>Missing <b>"+(missing===null?"—":missing)+"</b></span>";
  document.getElementById("breadth-scope").textContent = state.data.mode === "live" ? (universe>breadthTotal ? "CMC "+breadthTotal+"/"+universe : "CMC COVERED SET") : "DEMO SAMPLE";
  const breadthInfo = document.getElementById("breadth-info");
  breadthInfo.dataset.tip = state.data.mode === "live" ? "Breadth uses "+breadthTotal+" covered CMC assets from "+universe+" queried ("+(coverage===null?"coverage unavailable":coverage.toFixed(0)+"% coverage")+"); "+(declining===null?"declining count unavailable":declining+" declining")+", "+(flat===null?"flat count unavailable":flat+" flat")+", "+(missing===null?"missing count unavailable":missing+" missing")+"." : "Breadth counts positive 24h moves across this illustrative demo asset sample. It does not describe the full crypto market.";
  breadthInfo.title = breadthInfo.dataset.tip;
  const ring = document.getElementById("breadth-ring");
  const breadth = breadthAvailable ? Math.max(0,Math.min(100,g.breadth)) : 0;
  ring.style.borderRightColor = breadth > 45 ? "var(--lime)" : "var(--surface-3)";
  ring.style.borderBottomColor = breadth > 70 ? "var(--lime)" : "var(--surface-3)";
  const btcAsset = state.data.assets.find(a => a.symbol === "BTC");
  const narrative = document.getElementById("breadth-narrative");
  const btcMove = hasNumericValue(btcAsset?.change24h) ? "Bitcoin is "+(Number(btcAsset.change24h)>=0?"up":"down")+" <b>"+Math.abs(Number(btcAsset.change24h)).toFixed(2)+"%</b>, while " : "";
  narrative.innerHTML = !breadthAvailable ? "Market breadth is unavailable in this response." : btcMove+"<b>"+breadthCount+" of "+breadthTotal+"</b> covered assets are advancing; "+(declining===null?"declines unavailable":declining+" declining")+", "+(flat===null?"flat count unavailable":flat+" flat")+", "+(missing===null?"missing count unavailable":missing+" missing")+" ("+(coverage===null?"coverage unavailable":coverage.toFixed(0)+"% coverage")+"). Breadth adds context to the move; it does not identify its cause."; 
  document.getElementById("breadth-method").textContent = breadthAvailable ? "Positive 24h change · "+breadthTotal+" covered / "+universe+" queried "+(state.data.mode==="live"?"CMC assets":"illustrative demo assets") : "No usable asset coverage in this response";
  document.getElementById("market-timestamp").textContent = state.data.mode === "live" && state.data.retrievedAt
    ? `Retrieved ${new Date(state.data.retrievedAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}` : "Illustrative demo snapshot";
  const sentiment = g.sentiment;
  const hasSentiment = sentiment !== null && sentiment !== undefined && Number.isFinite(Number(sentiment));
  document.getElementById("sentiment-score").textContent = hasSentiment ? String(sentiment) : "—";
  const sentimentMetadata=g.sentimentMetadata||{};
  const sentimentClassification=sentimentMetadata.classification||g.sentimentClassification||(hasSentiment?(sentiment>=65?"Greed signal":sentiment<=35?"Fear signal":"Mixed sentiment"):"No live source enabled");
  document.getElementById("sentiment-label").textContent=sentimentClassification;
  const sentimentFoot=document.querySelector(".sentiment-card .metric-foot");
  if(sentimentFoot){const source=state.data.mode==="demo"?"Illustrative demo":(sentimentMetadata.source||g.sentimentSource||(hasSentiment?"CoinMarketCap":"source unavailable"));const timestamp=sentimentMetadata.observedAt||g.sentimentObservedAt||null;const validTimestamp=timestamp&&!Number.isNaN(new Date(timestamp).getTime())?" · "+new Date(timestamp).toLocaleString():" · timestamp unavailable";const label="context only · "+source+validTimestamp;const textNode=[...sentimentFoot.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);if(textNode)textNode.nodeValue=label+" ";else sentimentFoot.prepend(document.createTextNode(label+" "));const info=sentimentFoot.querySelector(".info-dot");if(info){info.dataset.tip=state.data.mode==="demo"?"This illustrative sentiment value is demo data, not a live market reading.":"CoinMarketCap Fear & Greed is a contextual sentiment signal, not a forecast or trading recommendation." ;info.title=info.dataset.tip;}}
  document.getElementById("sentiment-marker").style.left = hasSentiment ? `${Math.max(0,Math.min(100,Number(sentiment)))}%` : "0%";
  document.getElementById("sentiment-marker").style.display = hasSentiment ? "block" : "none";
  const dateEl = document.getElementById("local-date");
  dateEl.textContent = new Date().toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"}).toUpperCase();
  renderCategoryChart(); renderMovements(); renderThesisCards();
  const sparkHost=document.getElementById("market-sparkline");
  if(state.data.mode==="demo") sparkline(); else sparkHost.innerHTML="";
  setConnection(state.data.mode, state.data.retrievedAt);
  renderCompare(); renderExplore(); renderAtlas();
}

const ATLAS_CATEGORY_LABELS = ["Layer 1","Layer 2","Smart contracts","DeFi","AI & Data","Gaming","Meme","Stablecoins"];
const ATLAS_STABLECOIN_SYMBOLS = new Set(["USDT","USDC","DAI","FDUSD","USDE","USDS","TUSD","USDP"]);

function atlasCategory(asset){
  if(asset?.category)return String(asset.category);
  for(const tag of asset?.tags||[]){
    const value=typeof tag==="string"?tag:(tag?.slug||tag?.name||"");
    const key=String(value).toLowerCase().replace(/[^a-z0-9]+/g,"");
    const match=ATLAS_CATEGORY_LABELS.find(label=>label.toLowerCase().replace(/[^a-z0-9]+/g,"")===key);
    if(match)return match;
    if(key==="layer1s"||key==="layer1l1")return "Layer 1";
    if(key==="layer2s"||key==="layer2l2")return "Layer 2";
    if(key==="decentralizedfinance")return "DeFi";
    if(key==="artificialintelligence"||key==="aibigdata")return "AI & Data";
    if(key==="stablecoin")return "Stablecoins";
  }
  return "Unclassified";
}

function atlasIsStablecoin(asset){
  return ATLAS_STABLECOIN_SYMBOLS.has(String(asset?.symbol||"").toUpperCase()) ||
    atlasCategory(asset)==="Stablecoins" ||
    (asset?.tags||[]).some(tag=>String(typeof tag==="string"?tag:tag?.slug||tag?.name||"").toLowerCase().includes("stablecoin"));
}

function atlasRelativeChange(asset,all){
  if(hasNumericValue(asset?.relativeChange24h))return Number(asset.relativeChange24h);
  const category=atlasCategory(asset);
  if(category==="Unclassified")return null;
  const peers=all.filter(candidate=>String(candidate.id)!==String(asset.id)&&atlasCategory(candidate)===category&&hasNumericValue(candidate.change24h));
  if(!peers.length||!hasNumericValue(asset.change24h))return null;
  const mean=peers.reduce((sum,candidate)=>sum+Number(candidate.change24h),0)/peers.length;
  return Number(asset.change24h)-mean;
}

function atlasColor(relative){
  if(!Number.isFinite(relative))return "var(--muted)";
  if(relative>.25)return "var(--lime)";
  if(relative<-.25)return "var(--orange)";
  return "var(--blue)";
}

function renderAtlas(){
  const categorySelect=document.getElementById("atlas-category-filter");
  if(!categorySelect)return;
  const all=Array.isArray(state.data.assets)?state.data.assets:[];
  const known=[...new Set(all.map(atlasCategory))].sort((a,b)=>ATLAS_CATEGORY_LABELS.indexOf(a)-ATLAS_CATEGORY_LABELS.indexOf(b));
  const previousCategory=state.atlas.category;
  categorySelect.innerHTML='<option value="all">All categories</option>'+known.map(category=>'<option value="'+escapeHtml(category)+'">'+escapeHtml(category)+'</option>').join("");
  categorySelect.value=known.includes(previousCategory)?previousCategory:"all";
  state.atlas.category=categorySelect.value;
  const capSelect=document.getElementById("atlas-cap-filter");
  const stableToggle=document.getElementById("atlas-hide-stablecoins");
  capSelect.value=state.atlas.cap;
  stableToggle.checked=state.atlas.hideStablecoins;
  const universe=state.data.universe||{scope:state.data.mode==="live"?"top-100-by-market-cap":"illustrative-demo-sample",queriedCount:all.length,coveredCount:all.filter(asset=>hasNumericValue(asset.change24h)).length,missingCount:all.filter(asset=>!hasNumericValue(asset.change24h)).length,retrievedAt:state.data.retrievedAt,sourceObservedAt:null};
  const queried=Number(universe.queriedCount)||all.length;
  const covered=Number(universe.coveredCount)||0;
  const missing=Number(universe.missingCount)||0;
  document.getElementById("atlas-universe-scope").textContent=state.data.mode==="live"?"Top "+queried+" by market cap":"Illustrative demo sample · "+queried+" assets";
  document.getElementById("atlas-coverage").textContent=covered+" / "+queried+" · "+missing+" missing";
  const asof=universe.sourceObservedAt||universe.retrievedAt||state.data.retrievedAt;
  document.getElementById("atlas-asof").textContent=(state.data.mode==="live"?"CMC snapshot retrieved ":"Demo snapshot · ")+(asof?new Date(asof).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"time unavailable");
  document.getElementById("atlas-data-state").textContent=state.data.mode==="live"?"· live CMC data":"· demo values";
  const filtered=all.filter(asset=>{
    if(state.atlas.category!=="all"&&atlasCategory(asset)!==state.atlas.category)return false;
    if(state.atlas.hideStablecoins&&atlasIsStablecoin(asset))return false;
    const cap=Number(asset.marketCap);
    if(state.atlas.cap==="under-100m"&&(!Number.isFinite(cap)||cap>=1e8))return false;
    if(state.atlas.cap==="100m-1b"&&(!Number.isFinite(cap)||cap<1e8||cap>=1e9))return false;
    if(state.atlas.cap==="over-1b"&&(!Number.isFinite(cap)||cap<1e9))return false;
    return true;
  });
  if(!filtered.some(asset=>String(asset.id)===String(state.atlas.activeId)))state.atlas.activeId=filtered[0]?String(filtered[0].id):null;
  const plotted=filtered.filter(asset=>hasNumericValue(asset.change24h)&&Number.isFinite(atlasRelativeChange(asset,all)));
  document.getElementById("atlas-result-count").textContent=filtered.length+" assets · "+plotted.length+" with peer-relative coverage";
  const mapWrap=document.getElementById("atlas-map-wrap"),listWrap=document.getElementById("atlas-list-wrap");
  mapWrap.hidden=state.atlas.mode!=="map";listWrap.hidden=state.atlas.mode!=="list";
  document.getElementById("atlas-view-map").classList.toggle("selected",state.atlas.mode==="map");
  document.getElementById("atlas-view-map").setAttribute("aria-pressed",String(state.atlas.mode==="map"));
  document.getElementById("atlas-view-list").classList.toggle("selected",state.atlas.mode==="list");
  document.getElementById("atlas-view-list").setAttribute("aria-pressed",String(state.atlas.mode==="list"));

  const width=900,height=448,left=64,right=26,top=24,bottom=55,plotWidth=width-left-right,plotHeight=height-top-bottom;
  const coord=value=>Math.max(-20,Math.min(20,Number(value)));
  const px=value=>left+((coord(value)+20)/40)*plotWidth;
  const py=value=>top+((20-coord(value))/40)*plotHeight;
  let svg='<svg class="atlas-svg" viewBox="0 0 '+width+' '+height+'" role="group" aria-label="Interactive scatter plot of covered assets by absolute return and return relative to category peers">';
  for(let tick=-20;tick<=20;tick+=10){
    const xx=px(tick),yy=py(tick);
    svg+='<line x1="'+xx+'" y1="'+top+'" x2="'+xx+'" y2="'+(height-bottom)+'" class="'+(tick===0?"atlas-zero-line":"atlas-grid-line")+'"/>';
    svg+='<line x1="'+left+'" y1="'+yy+'" x2="'+(width-right)+'" y2="'+yy+'" class="'+(tick===0?"atlas-zero-line":"atlas-grid-line")+'"/>';
    svg+='<text x="'+xx+'" y="'+(height-bottom+21)+'" text-anchor="middle" class="atlas-axis-label">'+tick+'%</text>';
    svg+='<text x="'+(left-11)+'" y="'+(yy+4)+'" text-anchor="end" class="atlas-axis-label">'+tick+'%</text>';
  }
  svg+='<text x="'+(left+plotWidth/2)+'" y="'+(height-9)+'" text-anchor="middle" class="atlas-axis-title">ASSET 24H RETURN</text>';
  svg+='<text x="14" y="'+(top+plotHeight/2)+'" transform="rotate(-90 14 '+(top+plotHeight/2)+')" text-anchor="middle" class="atlas-axis-title">RELATIVE TO CATEGORY PEERS</text>';
  for(const asset of plotted){
    const relative=atlasRelativeChange(asset,all),change=Number(asset.change24h),marketCap=Number(asset.marketCap)||0;
    const radius=Math.max(5,Math.min(17,4+Math.max(0,Math.log10(Math.max(1,marketCap))-5)*1.35));
    const x=px(change),y=py(relative),color=atlasColor(relative),active=String(asset.id)===String(state.atlas.activeId),selected=state.atlas.selected.includes(String(asset.id));
    const relation=relative>0?"+":"";
    const aria=asset.name+" ("+asset.symbol+"), 24-hour return "+fmtPercent(change)+", relative to "+atlasCategory(asset)+" peers "+relation+relative.toFixed(2)+"%"+(selected?", in research cohort":"");
    svg+='<circle class="atlas-bubble'+(active?" active":"")+(selected?" selected":"")+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+radius.toFixed(1)+'" fill="'+color+'" tabindex="0" role="button" data-atlas-id="'+escapeHtml(asset.id)+'" aria-label="'+escapeHtml(aria)+'"><title>'+escapeHtml(asset.symbol+" · "+fmtPercent(change)+" absolute · "+relation+relative.toFixed(2)+"% relative")+'</title></circle>';
  }
  svg+='</svg>';
  document.getElementById("atlas-map").innerHTML=plotted.length?svg:'<div class="atlas-empty">No assets in this filtered set have both a reported 24-hour return and covered category peers. Switch category or use the accessible list.</div>';
  const list=document.getElementById("atlas-list");
  if(!filtered.length)list.innerHTML='<div class="atlas-empty">No assets match the current filters. Clear a filter to see the market sample.</div>';
  else list.innerHTML=filtered.map(asset=>{
    const relative=atlasRelativeChange(asset,all),change=hasNumericValue(asset.change24h)?Number(asset.change24h):null;
    const selected=state.atlas.selected.includes(String(asset.id));
    return '<article class="atlas-list-row" role="listitem"><button class="atlas-list-main" data-atlas-id="'+escapeHtml(asset.id)+'"><span class="atlas-list-name"><strong>'+escapeHtml(asset.name)+'</strong><small>'+escapeHtml(asset.symbol)+' · '+escapeHtml(atlasCategory(asset))+'</small></span><span class="atlas-list-move '+(change===null?"missing":change>=0?"positive":"negative")+'">'+(change===null?"—":fmtPercent(change))+'</span><span class="atlas-list-relative">'+(relative===null?"No peer sample":fmtPercent(relative))+'</span><span class="atlas-list-cap">'+money(asset.marketCap)+'</span></button><button class="atlas-row-add" data-atlas-toggle="'+escapeHtml(asset.id)+'" aria-label="'+(selected?"Remove ":"Add ")+escapeHtml(asset.symbol||asset.name)+(selected?" from":" to")+' research cohort">'+(selected?"✓":"＋")+'</button></article>';
  }).join("");

  const active=all.find(asset=>String(asset.id)===String(state.atlas.activeId));
  const selectedAssets=state.atlas.selected.map(id=>all.find(asset=>String(asset.id)===id)).filter(Boolean);
  const selectedMarkup=selectedAssets.length?'<div class="atlas-selected-chips">'+selectedAssets.map(asset=>'<button data-atlas-remove="'+escapeHtml(asset.id)+'" aria-label="Remove '+escapeHtml(asset.symbol||asset.name)+' from research cohort">'+escapeHtml(asset.symbol||asset.name)+' ×</button>').join("")+'</div>':'<div class="atlas-selected-empty">No assets in the cohort yet.</div>';
  let detail='<div class="empty-hint">Select an asset bubble or row to inspect its context.</div>';
  if(active){
    const relative=atlasRelativeChange(active,all),change=hasNumericValue(active.change24h)?Number(active.change24h):null;
    const derivedPeers=all.filter(candidate=>String(candidate.id)!==String(active.id)&&atlasCategory(candidate)===atlasCategory(active));
    const derivedCovered=derivedPeers.filter(candidate=>hasNumericValue(candidate.change24h)).length;
    const peers=hasNumericValue(active.categoryPeerCount)?Number(active.categoryPeerCount):derivedCovered;
    const peerUniverse=hasNumericValue(active.categoryPeerUniverse)?Number(active.categoryPeerUniverse):derivedPeers.length;
    const peerText=relative===null?"No covered category peer sample":peers+" covered of "+peerUniverse+" category peers";
    const has=state.atlas.selected.includes(String(active.id));
    detail='<div class="atlas-asset-detail"><div class="atlas-detail-heading"><div><span class="atlas-kicker">'+escapeHtml(atlasCategory(active))+'</span><h3>'+escapeHtml(active.name)+'</h3><small>'+escapeHtml(active.symbol)+' · CMC ID '+escapeHtml(active.id)+'</small></div><span class="atlas-detail-icon">'+escapeHtml(String(active.symbol||"?").slice(0,1))+'</span></div><div class="atlas-detail-metrics"><div><span>24H RETURN</span><strong class="'+(change===null?"missing":change>=0?"positive":"negative")+'">'+(change===null?"—":fmtPercent(change))+'</strong></div><div><span>VS CATEGORY PEERS</span><strong class="'+(relative===null?"missing":relative>=0?"positive":"negative")+'">'+(relative===null?"—":fmtPercent(relative))+'</strong></div><div><span>MARKET CAP</span><strong>'+money(active.marketCap)+'</strong></div><div><span>24H VOLUME</span><strong>'+money(active.volume24h)+'</strong></div></div><div class="atlas-peer-coverage"><span>'+escapeHtml(peerText)+'</span><span>CMC observed '+escapeHtml(active.observedAt?new Date(active.observedAt).toLocaleString():"time unavailable")+'</span></div><div class="atlas-detail-actions"><button class="secondary-button" data-atlas-toggle="'+escapeHtml(active.id)+'">'+(has?"Remove from cohort":"＋ Add to cohort")+'</button><button class="text-button" data-atlas-open="'+escapeHtml(active.id)+'">Open asset dossier ↗</button></div></div>';
  }
  document.getElementById("atlas-selection-summary").innerHTML=detail+selectedMarkup;
  document.getElementById("atlas-selection-count").textContent=state.atlas.selected.length+" / 8 selected";
  document.getElementById("atlas-compare-selection").disabled=state.atlas.selected.length<2;
  document.getElementById("atlas-thesis-selection").disabled=state.atlas.selected.length<2;
  document.getElementById("atlas-clear-selection").disabled=state.atlas.selected.length===0;

  document.querySelectorAll("#atlas-map [data-atlas-id],#atlas-list [data-atlas-id]").forEach(el=>{
    el.addEventListener("click",()=>{state.atlas.activeId=String(el.dataset.atlasId);renderAtlas();});
    el.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();state.atlas.activeId=String(el.dataset.atlasId);renderAtlas();}});
  });
  document.querySelectorAll("#atlas-list [data-atlas-toggle],#atlas-selection-summary [data-atlas-toggle]").forEach(el=>el.addEventListener("click",()=>toggleAtlasSelection(el.dataset.atlasToggle)));
  document.querySelectorAll("#atlas-selection-summary [data-atlas-remove]").forEach(el=>el.addEventListener("click",()=>toggleAtlasSelection(el.dataset.atlasRemove,true)));
  document.querySelectorAll("#atlas-selection-summary [data-atlas-open]").forEach(el=>el.addEventListener("click",()=>{const asset=all.find(item=>String(item.id)===String(el.dataset.atlasOpen));if(asset)showAsset(asset.symbol||asset.id);}));
}

function toggleAtlasSelection(id,removeOnly=false){
  const key=String(id),selected=[...state.atlas.selected];
  if(selected.includes(key)){if(!removeOnly)state.atlas.selected=selected.filter(item=>item!==key);}
  else if(!removeOnly){if(selected.length>=8){toast("The research cohort is limited to eight CMC assets.",true);return;}state.atlas.selected=[...selected,key];state.atlas.activeId=key;}
  renderAtlas();
}

function carryAtlasSelectionToCompare(startThesis=false){
  const assets=state.atlas.selected.map(id=>state.data.assets.find(asset=>String(asset.id)===String(id))).filter(Boolean);
  if(assets.length<2){toast("Select at least two assets for a matched comparison.",true);return;}
  state.compareAssetCache||={};
  for(const asset of assets)state.compareAssetCache[String(asset.id)]=asset;
  state.compareSymbols=assets.map(asset=>String(asset.id));
  normalizeCompareSelections();
  if(startThesis){comparisonThesisForm();return;}
  switchView("compare");
  renderCompare();
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".page-view").forEach(el => el.classList.remove("active"));
  const target = document.getElementById(`view-${view}`); if (target) target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  document.getElementById("breadcrumb-current").textContent = ({pulse:"Market pulse",explore:"Explore assets",compare:"Compare",atlas:"Market Atlas",theses:"Thesis log",settings:"Settings"})[view] || "Workspace";
  document.getElementById("sidebar").classList.remove("open");
  if (view === "compare") loadCompareHistory();
  if (view === "atlas") renderAtlas();
  window.scrollTo({top:0,behavior:"smooth"});
}

function openModal(html) {
  const back = document.getElementById("modal-backdrop");
  document.getElementById("modal-card").innerHTML = html;
  back.classList.add("open"); back.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  const close = document.getElementById("modal-close"); if (close) close.addEventListener("click", closeModal);
  back.addEventListener("click", backdropClose, {once:true});
  document.addEventListener("keydown", escapeClose, {once:true});
  const first = document.querySelector("#modal-card input, #modal-card textarea, #modal-card button"); if(first) setTimeout(()=>first.focus(),25);
}
function backdropClose(e) { if (e.target.id === "modal-backdrop") closeModal(); else document.getElementById("modal-backdrop").addEventListener("click", backdropClose, {once:true}); }
function escapeClose(e) { if (e.key === "Escape") closeModal(); else document.addEventListener("keydown", escapeClose, {once:true}); }
function closeModal() { const b=document.getElementById("modal-backdrop");b.classList.remove("open");b.setAttribute("aria-hidden","true");document.body.style.overflow=""; }
function toast(message, error=false) { const el=document.createElement("div");el.className=`toast ${error?"error":""}`;el.innerHTML=`<i></i><span>${escapeHtml(message)}</span>`;document.getElementById("toast-region").append(el);setTimeout(()=>el.remove(),3400); }

function compareAssetBySelection(selection) { return state.data.assets.find(a=>String(a.id)===String(selection)) || state.compareAssetCache?.[String(selection)] || state.data.assets.find(a=>a.symbol===selection) || null; }
function normalizeCompareSelections() { state.compareAssetCache ||= {}; const seen=new Set(); state.compareSymbols=state.compareSymbols.map(selection=>{const asset=compareAssetBySelection(selection);if(!asset)return null;state.compareAssetCache[String(asset.id)]=asset;return String(asset.id);}).filter(id=>{if(!id||seen.has(id))return false;seen.add(id);return true;}); }

function comparisonThesisForm() {
  normalizeCompareSelections();
  const selections=[...state.compareSymbols];
  const assets=selections.map(compareAssetBySelection);
  const unique=assets.filter((a,i)=>a&&assets.findIndex(b=>String(b?.id)===String(a.id))===i);
  if(unique.length<2||unique.length!==assets.length||unique.some(a=>!/^\d{1,12}$/.test(String(a.id)))){
    toast("Select at least two distinct CMC assets before saving this comparison.",true);return;
  }
  const key=`${state.comparePeriod}:${state.compareSymbols.join(",")}`;
  const cachedHistory=state.historicalCache[key];
  const historyById=new Map((cachedHistory||[]).map(row=>{const asset=compareAssetBySelection(row.symbol);return [String(asset?.id||""),row];}));
  const metricCount=field=>unique.filter(a=>field==="peerContext"?Boolean(a.peers):hasNumericValue(a[field])).length;
  const comparison={
    period:state.comparePeriod,
    periodLabel:({ "7D":"7 days","30D":"30 days","90D":"90 days" })[state.comparePeriod]||state.comparePeriod,
    currency:"USD",
    sourceProvider:state.data.mode==="live"?"coinmarketcap":"demo",
    capturedAt:new Date().toISOString(),
    sourceObservedAt:state.data.source?.observedAt??null,
    retrievedAt:state.data.retrievedAt??null,
    coverage:{
      selectedAssets:selections.length,
      availableAssets:unique.length,
      metrics:{price:metricCount("price"),change24h:metricCount("change24h"),marketCap:metricCount("marketCap"),volume24h:metricCount("volume24h"),peerContext:metricCount("peerContext")}
    },
    history:{
      status:state.data.mode!=="live"?"not_requested":cachedHistory?"loaded":"unloaded",
      sourceProvider:state.data.mode==="live"?"coinmarketcap":"demo",
      period:state.comparePeriod,
      assets:unique.map(a=>{
        const row=historyById.get(String(a.id));
        const points=(row?.series||[]).filter(p=>hasNumericValue(p.price)&&p.timestamp).map(p=>({timestamp:p.timestamp,price:Number(p.price)}));
        return {id:String(a.id),status:points.length?"loaded":"unavailable",points};
      })
    },
    assets:unique.map(a=>({
      id:String(a.id),name:a.name,symbol:a.symbol,
      price:hasNumericValue(a.price)?Number(a.price):null,
      change24h:hasNumericValue(a.change24h)?Number(a.change24h):null,
      marketCap:hasNumericValue(a.marketCap)?Number(a.marketCap):null,
      volume24h:hasNumericValue(a.volume24h)?Number(a.volume24h):null,
      peerContext:a.peers??null,
      quoteObservedAt:a.observedAt??null
    }))
  };
  thesisForm({assets:unique,primaryId:String(unique[0].id),comparison});
}

function savedComparisonMarkup(comparison) {
  if(!comparison||!Array.isArray(comparison.assets)||!comparison.assets.length)return "";
  const rows=comparison.assets.map(a=>{
    const history=(comparison.history?.assets||[]).find(row=>String(row.id)===String(a.id));
    const points=history?.points||[];
    const historySummary=history?.status==="loaded"
      ? `Historical points: ${points.length} · ${points[0]?.timestamp||"time unavailable"} → ${points[points.length-1]?.timestamp||"time unavailable"}.`
      : "Historical points were not available when this comparison was saved.";
    return `<div class="evidence-row"><i></i><div><strong>${escapeHtml(a.name||a.symbol||"Asset")} <span style="color:var(--lime);font-family:var(--mono);font-weight:400">${escapeHtml(a.symbol||"")} · CMC #${escapeHtml(a.id||"—")}</span></strong><small>Price: ${a.price===null||a.price===undefined?"—":money(a.price,a.price<1?4:2)} · 24h: ${fmtOptionalPercent(a.change24h)} · Market cap: ${amountLabel(a.marketCap)} · 24h volume: ${amountLabel(a.volume24h)}.</small><small>Peer context: ${escapeHtml(a.peerContext||"not supplied")} · Quote timestamp: ${escapeHtml(a.quoteObservedAt||"not supplied")}.</small><small>${escapeHtml(historySummary)}</small></div></div>`;
  }).join("");
  const coverage=comparison.coverage||{},metrics=coverage.metrics||{};
  const coverageDetail=`Coverage: ${coverage.availableAssets??comparison.assets.length}/${coverage.selectedAssets??comparison.assets.length} selected assets · price ${metrics.price??"—"}, 24h change ${metrics.change24h??"—"}, market cap ${metrics.marketCap??"—"}, volume ${metrics.volume24h??"—"}, peer context ${metrics.peerContext??"—"} available.`;
  const historyStatus=comparison.history?.status==="loaded"?"historical quotes loaded":comparison.history?.status==="unloaded"?"historical quotes not loaded":"historical quotes not requested";
  return `<div class="detail-section" data-saved-comparison><h3>SAVED COMPARISON · ${escapeHtml(comparison.periodLabel||comparison.period||"Original period")}</h3><div class="detail-note">Captured ${escapeHtml(comparison.capturedAt||"")} · ${escapeHtml(comparison.currency||"USD")} · ${escapeHtml(comparison.sourceProvider||"source unavailable")}. ${escapeHtml(coverageDetail)} ${escapeHtml(historyStatus)}. Source observed ${escapeHtml(comparison.sourceObservedAt||"time unavailable")} · retrieved ${escapeHtml(comparison.retrievedAt||"time unavailable")}.</div><div class="detail-evidence">${rows}</div></div>`;
}

function windowUnavailableMessage(status){
  if(status==="not_comparable")return "A live CMC quote and a CMC-captured comparison baseline are required.";
  if(status==="window_too_wide")return "This saved baseline is outside the 366-day historical window supported here.";
  if(status==="plan_unavailable")return "This CMC plan did not return historical quotes. Point-in-time quote review is still available.";
  if(status==="rate_limited")return "CMC rate-limited the historical request. No points were estimated.";
  if(status==="budget_exhausted")return "The shared historical replay budget is used for this hour. Try again after it resets.";
  if(status==="budget_unavailable")return "The shared historical request budget is unavailable right now. No CMC request was made.";
  if(status==="auth_required")return "Sign in to load matched CMC history. Your point-quote replay remains available.";
  if(status==="insufficient_assets")return "At least two valid saved CMC asset IDs are needed for a matched window.";
  if(status==="demo_mode")return "This environment is using demo data, so no CMC historical request was made.";
  if(status==="no_points")return "CMC returned no usable historical points for this saved window. No values were filled in.";
  return "The historical request is unavailable right now. Saved point-quote replay remains available.";
}

async function captureMatchedWindowReplay(comparison,items,endAt,receiptSink,comparisonReady){
  const startAt=comparison?.capturedAt||null;
  if(!comparisonReady||!startAt)return {status:"not_comparable",startAt,endAt,interval:"24h",assets:[]};
  const startMs=Date.parse(startAt),endMs=Date.parse(endAt);
  if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<=startMs)return {status:"not_comparable",startAt,endAt,interval:"24h",assets:[]};
  if(endMs-startMs>366*24*60*60*1000)return {status:"window_too_wide",startAt,endAt,interval:"24h",assets:[]};
  const ids=items.filter(item=>/^\d{1,12}$/.test(String(item.id))).map(item=>String(item.id));
  if(ids.length<2)return {status:"insufficient_assets",startAt,endAt,interval:"24h",assets:[]};
  const token=state.auth.session?.access_token;
  if(!token)return {status:"auth_required",startAt,endAt,interval:"24h",assets:[]};
  let response,body;
  try{
    response=await fetch("/api/market?view=window-history&ids="+encodeURIComponent(ids.join(","))+"&start="+encodeURIComponent(new Date(startMs).toISOString())+"&end="+encodeURIComponent(new Date(endMs).toISOString()),{headers:{Accept:"application/json",Authorization:"Bearer "+token}});
    body=await response.json().catch(()=>({}));
    if(Array.isArray(body.sourceReceipts))receiptSink.push(...body.sourceReceipts);
  }catch{return {status:"unavailable",startAt,endAt,interval:"24h",assets:[]};}
  if(!response.ok){
    const status=body.error==="WINDOW_TOO_WIDE"?"window_too_wide":body.error==="CMC_ENTITLEMENT_OR_KEY"?"plan_unavailable":body.error==="CMC_RATE_LIMITED"?"rate_limited":body.error==="CMC_HISTORY_BUDGET_EXHAUSTED"?"budget_exhausted":body.error==="CMC_HISTORY_BUDGET_UNAVAILABLE"?"budget_unavailable":body.error==="CMC_HISTORY_AUTH_REQUIRED"?"auth_required":"unavailable";
    return {status,startAt,endAt,interval:"24h",assets:[]};
  }
  if(body.mode!=="live")return {status:"demo_mode",startAt,endAt,interval:"24h",assets:[]};
  const expectedDays=Math.max(1,Math.ceil((endMs-startMs)/(24*60*60*1000)));
  const assets=items.map(item=>{
    const base=Number(item.baselinePrice);
    const raw=Array.isArray(body.series?.[item.id])?body.series[item.id]:[];
    const historical=base>0?raw.filter(point=>Date.parse(point.timestamp)>startMs&&Date.parse(point.timestamp)<=endMs&&hasNumericValue(point.price)&&Number(point.price)>0).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)):[];
    const normalized=[{timestamp:new Date(startMs).toISOString(),price:base,index:100,kind:"saved baseline"}];
    for(const point of historical){
      const index=(Number(point.price)/base)*100;
      if(Number.isFinite(index))normalized.push({timestamp:point.timestamp,price:Number(point.price),index,kind:"CMC history"});
    }
    const latestAt=Date.parse(item.sourceObservedAt||"");
    if(base>0&&hasNumericValue(item.currentPrice)&&Number(item.currentPrice)>0&&latestAt>startMs&&latestAt<=endMs){
      const index=(Number(item.currentPrice)/base)*100;
      if(Number.isFinite(index)&&!normalized.some(point=>point.timestamp===new Date(latestAt).toISOString()))normalized.push({timestamp:new Date(latestAt).toISOString(),price:Number(item.currentPrice),index,kind:"CMC latest"});
    }
    normalized.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
    return {id:String(item.id),symbol:item.symbol||"",name:item.name||"",baselinePrice:base>0?base:null,historyPoints:historical.length,expectedPoints:expectedDays,coveragePct:Math.min(100,Math.floor((historical.length/expectedDays)*100)),points:normalized};
  });
  const loaded=assets.filter(asset=>asset.historyPoints>0).length;
  const gaps=assets.some(asset=>asset.historyPoints<asset.expectedPoints);
  return {status:loaded===0?"no_points":loaded<assets.length||gaps?"partial":"complete",startAt:new Date(startMs).toISOString(),endAt:new Date(endMs).toISOString(),interval:"24h",expectedDays,assets};
}

function matchedWindowChartMarkup(windowReplay){
  if(!windowReplay)return "";
  const assets=(windowReplay.assets||[]).filter(asset=>asset.historyPoints>0&&asset.points?.length>1);
  if(!assets.length)return '<div class="window-empty">'+escapeHtml(windowUnavailableMessage(windowReplay.status))+'</div>';
  const width=760,height=286,left=54,right=18,top=18,bottom=34;
  const start=Date.parse(windowReplay.startAt),end=Date.parse(windowReplay.endAt);
  const values=assets.flatMap(asset=>asset.points.map(point=>point.index)).filter(Number.isFinite);
  let min=Math.min(100,...values),max=Math.max(100,...values);
  if(max-min<8){min-=4;max+=4;}else{const pad=(max-min)*.12;min-=pad;max+=pad;}
  const x=timestamp=>left+((Date.parse(timestamp)-start)/Math.max(1,end-start))*(width-left-right);
  const y=value=>top+((max-value)/Math.max(1,max-min))*(height-top-bottom);
  const palette=["#c8f35a","#9ab6ff","#f28e82","#f1bc73","#d19aff","#55d6be","#ff8ec7","#aab5ad"];
  let svg='<svg class="window-chart-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Daily CMC quote paths, each indexed to 100 at the saved baseline">';
  for(let tick=0;tick<4;tick++){
    const value=min+(max-min)*tick/3,yy=y(value);
    svg+='<line x1="'+left+'" y1="'+yy.toFixed(2)+'" x2="'+(width-right)+'" y2="'+yy.toFixed(2)+'" class="window-grid"/>';
    svg+='<text x="'+(left-8)+'" y="'+(yy+4).toFixed(2)+'" text-anchor="end" class="window-axis-label">'+value.toFixed(0)+'</text>';
  }
  svg+='<line x1="'+left+'" y1="'+y(100).toFixed(2)+'" x2="'+(width-right)+'" y2="'+y(100).toFixed(2)+'" class="window-baseline"/>';
  for(let index=0;index<assets.length;index++){
    const asset=assets[index],color=palette[index%palette.length];
    const segments=[];let segment=[];
    for(const point of asset.points){
      if(segment.length&&Date.parse(point.timestamp)-Date.parse(segment[segment.length-1].timestamp)>36*60*60*1000){segments.push(segment);segment=[];}
      segment.push(point);
    }
    if(segment.length)segments.push(segment);
    svg+=segments.map(points=>'<path d="'+points.map((point,pointIndex)=>(pointIndex?"L":"M")+x(point.timestamp).toFixed(2)+" "+y(point.index).toFixed(2)).join(" ")+'" fill="none" stroke="'+color+'" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>').join("");
    const last=asset.points[asset.points.length-1];
    svg+=asset.points.map(point=>'<circle cx="'+x(point.timestamp).toFixed(2)+'" cy="'+y(point.index).toFixed(2)+'" r="'+(point===last?"3.5":"1.5")+'" fill="'+color+'"/>').join("");
  }
  svg+='<text x="'+left+'" y="'+(height-7)+'" class="window-axis-label">'+escapeHtml(safeDate(windowReplay.startAt))+'</text>';
  svg+='<text x="'+(width-right)+'" y="'+(height-7)+'" text-anchor="end" class="window-axis-label">'+escapeHtml(safeDate(windowReplay.endAt))+'</text></svg>';
  const legend=assets.map((asset,index)=>'<span class="window-legend-item"><i style="background:'+palette[index%palette.length]+'"></i>'+escapeHtml(asset.symbol||asset.name)+'</span>').join("");
  const coverage=(windowReplay.assets||[]).map(asset=>'<div class="window-coverage-row"><span>'+escapeHtml(asset.symbol||asset.name)+'</span><span>'+asset.historyPoints+'/'+asset.expectedPoints+' daily samples · '+asset.coveragePct+'% · '+Math.max(0,asset.expectedPoints-asset.historyPoints)+' gaps</span></div>').join("");
  return '<div class="matched-window"><div class="window-chart-heading"><div><strong>Matched window · indexed to 100</strong><span>'+escapeHtml(safeDate(windowReplay.startAt))+' → '+escapeHtml(safeDate(windowReplay.endAt))+' · CMC 24h snapshots</span></div><span>Daily points only</span></div>'+svg+'<div class="window-legend">'+legend+'</div><div class="window-coverage">'+coverage+'</div><p class="window-method">Each path starts from its immutable saved quote. Only returned CMC observations are plotted; skipped intervals remain visible as gaps in coverage and are not estimated.</p></div>';
}

async function captureComparisonReplay(t,isLive,primaryResponse){
  const comparison=t.baselineSnapshot?.comparison;
  if(!comparison||!Array.isArray(comparison.assets)||comparison.assets.length<2)return null;
  const sourceMatches=String(comparison.sourceProvider||t.baselineSnapshot?.sourceProvider||"").toLowerCase()==="coinmarketcap";
  const comparisonReady=!!isLive&&sourceMatches;
  const receiptBatch=[...(primaryResponse?.sourceReceipts||[])];
  const assets=comparison.assets.slice(0,8);
  const primaryId=String(t.assetId||assets[0]?.id||"");
  const benchmarkAsset=assets.find(a=>String(a.id)===primaryId)||assets[0];
  const benchmarkId=String(benchmarkAsset?.id||"");
  const items=await Promise.all(assets.map(async baseline=>{
    const id=String(baseline.id||"");
    const basePrice=hasNumericValue(baseline.price)&&Number(baseline.price)>0?Number(baseline.price):null;
    if(!/^\d{1,12}$/.test(id))return {id,symbol:baseline.symbol||"",name:baseline.name||"",baselinePrice:basePrice,currentPrice:null,priceReturnPct:null,relativeToBenchmarkPp:null,sourceObservedAt:null,retrievedAt:null,status:"invalid_id"};
    if(!comparisonReady)return {id,symbol:baseline.symbol||"",name:baseline.name||"",baselinePrice:basePrice,currentPrice:null,priceReturnPct:null,relativeToBenchmarkPp:null,sourceObservedAt:null,retrievedAt:null,status:"unavailable"};
    let payload=null;
    try{
      if(id===String(t.assetId)&&primaryResponse)payload=primaryResponse;
      else{const response=await fetch(`/api/market?view=asset&id=${encodeURIComponent(id)}`,{headers:{Accept:"application/json"}});payload=await response.json();if(Array.isArray(payload?.sourceReceipts))receiptBatch.push(...payload.sourceReceipts);}
    }catch{}
    const asset=payload?.asset;
    if(!asset||String(asset.id)!==id||!hasNumericValue(asset.price)||Number(asset.price)<=0)return {id,symbol:baseline.symbol||"",name:baseline.name||"",baselinePrice:basePrice,currentPrice:null,priceReturnPct:null,relativeToBenchmarkPp:null,sourceObservedAt:null,retrievedAt:payload?.retrievedAt||null,status:"unavailable"};
    const priceReturnPct=basePrice!==null?((Number(asset.price)-basePrice)/basePrice)*100:null;
    return {id,symbol:baseline.symbol||asset.symbol||"",name:baseline.name||asset.name||"",baselinePrice:basePrice,currentPrice:Number(asset.price),priceReturnPct,relativeToBenchmarkPp:null,sourceObservedAt:payload?.source?.observedAt??asset.observedAt??null,retrievedAt:payload?.retrievedAt||null,status:"live"};
  }));
  const benchmark=items.find(item=>item.id===benchmarkId);
  for(const item of items){if(item.status==="live"&&item.priceReturnPct!==null&&benchmark?.status==="live"&&benchmark.priceReturnPct!==null)item.relativeToBenchmarkPp=item.priceReturnPct-benchmark.priceReturnPct;}
  const relatives=items.filter(item=>item.id!==benchmarkId&&item.relativeToBenchmarkPp!==null).map(item=>item.relativeToBenchmarkPp);
  const availableAssets=items.filter(item=>item.status==="live").length;
  const capturedAt=new Date().toISOString();
  const matchedWindow=await captureMatchedWindowReplay(comparison,items,capturedAt,receiptBatch,comparisonReady);
  state.latestSourceReceipts=[...new Map(receiptBatch.map(receipt=>[receipt.requestId,receipt])).values()];
  return {sourceProvider:availableAssets?"coinmarketcap":"unavailable",sourceEndpoint:"/v3/cryptocurrency/quotes/latest",capturedAt,baselineCapturedAt:comparison.capturedAt||t.baselineSnapshot?.capturedAt||null,benchmarkId,benchmarkSymbol:benchmarkAsset?.symbol||t.assetSymbol||"",selectedAssets:comparison.assets.length,replayedAssets:assets.length,availableAssets,status:!comparisonReady?"not_comparable":availableAssets===assets.length?"complete":availableAssets?"partial":"unavailable",cohortRelativePct:relatives.length?relatives.reduce((sum,value)=>sum+value,0)/relatives.length:null,items,matchedWindow};
}

function comparisonReplayMarkup(replay){
  if(!replay)return "";
  const rows=(replay.items||[]).map(item=>{
    const baseline=item.baselinePrice===null||item.baselinePrice===undefined?"—":money(item.baselinePrice,item.baselinePrice<1?4:2);
    const latest=item.currentPrice===null||item.currentPrice===undefined?"—":money(item.currentPrice,item.currentPrice<1?4:2);
    const change=item.priceReturnPct===null?"—":fmtPercent(item.priceReturnPct);
    const relative=item.relativeToBenchmarkPp===null?"—":`${fmtPercent(item.relativeToBenchmarkPp)} pp`;
    const status=item.status==="live"?(item.sourceObservedAt?`CMC observed ${safeDate(item.sourceObservedAt)}`:"CMC quote retrieved; source timestamp unavailable"):item.status==="invalid_id"?"Saved CMC ID is invalid":replay.status==="not_comparable"?"Requires a live CMC source and a CMC-captured baseline":"Fresh quote unavailable; no return calculated";
    return `<div class="evidence-row"><i style="background:${item.status==="live"?"var(--lime)":"var(--quiet)"}"></i><div><strong>${escapeHtml(item.name||item.symbol||"Asset")} <span style="color:var(--lime);font-family:var(--mono);font-weight:400">${escapeHtml(item.symbol||"")} · CMC #${escapeHtml(item.id)}</span></strong><small>Baseline ${baseline} → latest ${latest} · return ${change} · relative vs ${escapeHtml(replay.benchmarkSymbol||"primary asset")} ${relative}</small><small>${escapeHtml(status)} · retrieved ${escapeHtml(item.retrievedAt?safeDate(item.retrievedAt):"unavailable")}</small></div></div>`;
  }).join("");
  const status=replay.status==="complete"?"All saved assets refreshed":replay.status==="partial"?"Partial refresh; unavailable assets remain blank":replay.status==="not_comparable"?"Replay requires live CMC data and a CMC-captured baseline":"No matched live CMC quotes were available";
  const cohort=replay.cohortRelativePct===null?"The relative cohort return is unavailable.":`Equal-weight mean return of refreshed non-benchmark assets versus ${escapeHtml(replay.benchmarkSymbol||"the primary asset")}: ${fmtPercent(replay.cohortRelativePct)} percentage points.`;
  const window=replay.matchedWindow;
  const windowStatus=window?.status==="complete"?"Historical path loaded for every saved asset":window?.status==="partial"?"Historical path has gaps or missing assets":windowUnavailableMessage(window?.status);
  return `<div class="detail-section" data-comparison-replay><h3>COMPARISON REPLAY · RELATIVE VS ${escapeHtml(replay.benchmarkSymbol||"PRIMARY ASSET")}</h3><div class="detail-note">${status} · ${replay.availableAssets}/${replay.replayedAssets} refreshed. Each return uses the saved baseline quote and the validated live CMC quote. Relative values are percentage-point differences versus the primary asset; the cohort summary is equal-weighted. ${cohort} Missing values are not imputed. This is descriptive evidence, not a prediction.</div><div class="detail-section matched-window-section"><h3>BASELINE TO REVIEW · SAME CMC WINDOW</h3><div class="detail-note">${escapeHtml(windowStatus)}. The same saved baseline timestamp and review timestamp are requested for each CMC ID. Historical access and depth depend on the CMC plan.</div>${matchedWindowChartMarkup(window)}</div><div class="detail-evidence">${rows}</div></div>`;
}

function thesisForm({assets=state.data.assets,primaryId=null,comparison=null}={}) {
  const options=[...assets];
  const date = new Date(); date.setDate(date.getDate()+7);
  const dateValue = date.toISOString().slice(0,10);
  openModal(`<div class="modal-head"><div><div class="panel-kicker">A RECORD YOU CAN RETURN TO</div><h2 id="modal-title">Start a thesis</h2><p>Write down the view and the evidence you have today.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><form class="thesis-form" id="thesis-form"><div class="field"><label for="thesis-question">WHAT ARE YOU TRYING TO UNDERSTAND?</label><input id="thesis-question" name="title" maxlength="90" placeholder="e.g. Is SOL outperforming other layer 1s?" required /></div><div class="form-grid"><div class="field"><label for="thesis-asset">PRIMARY ASSET</label><select id="thesis-asset" name="asset">${options.map(a=>`<option value="${escapeHtml(a.id)}"${String(a.id)===String(primaryId||options[0]?.id)?" selected":""}>${escapeHtml(a.name)} · ${escapeHtml(a.symbol)} · CMC #${escapeHtml(a.id)}</option>`).join("")}</select></div><div class="field"><label for="thesis-review">REVIEW AFTER</label><select id="thesis-review" name="horizon"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div></div><div class="field"><label for="thesis-view">YOUR CURRENT VIEW <span style="color:var(--quiet)">· OPTIONAL</span></label><textarea id="thesis-view" name="view" maxlength="600" placeholder="What do you think is happening? What might change your mind?"></textarea><span class="field-help">Your view is saved in this browser. CMC Lens does not generate buy or sell instructions.</span></div><div class="field"><label for="thesis-condition">WHAT WOULD CHANGE YOUR VIEW? <span style="color:var(--quiet)">· OPTIONAL</span></label><input id="thesis-condition" name="condition" maxlength="180" placeholder="e.g. Relative strength fades against the L1 group" /></div><div class="form-actions"><button type="button" class="form-cancel" id="form-cancel">Cancel</button><button type="submit" class="primary-button">Save research record <span>→</span></button></div></form>`);
  document.getElementById("form-cancel").addEventListener("click",closeModal);
  document.getElementById("thesis-form").addEventListener("submit", e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget); const assetId=String(fd.get("asset")); const a=options.find(row=>String(row.id)===assetId)||null; const symbol=a?.symbol||""; const d=new Date();
    const review=new Date();review.setDate(review.getDate()+Number(fd.get("horizon")));
    const source=state.data.mode==="live"?"CoinMarketCap":"Demo dataset";
    const t={id:crypto.randomUUID(),title:String(fd.get("title")).trim(),assetId:a?.id||null,assetSymbol:symbol,assetName:a?.name||symbol,view:String(fd.get("view")||"").trim(),condition:String(fd.get("condition")||"").trim(),createdAt:d.toISOString(),updatedAt:d.toISOString(),reviewAt:review.toISOString(),status:"open",baselineSnapshotId:crypto.randomUUID(),baselineSnapshot:{...(comparison?{comparison}:{}),sourceProvider:source==="CoinMarketCap"?"coinmarketcap":"demo",sourceEndpoint:source==="CoinMarketCap"?"/v3/cryptocurrency/quotes/latest":null,sourceObservedAt:a?.observedAt??null,capturedAt:d.toISOString(),currency:"USD",metrics:{price:a?.price??null,change24h:a?.change24h??null,marketCap:a?.marketCap??null,volume24h:a?.volume24h??null,peerContext:a?.peers||null},coverage:source==="CoinMarketCap"?"complete":"partial",limitations:source==="CoinMarketCap"?"Quote snapshot only; it does not establish the cause of a price move.":"Illustrative demo values, not live market evidence."},evidence:[{label:`${symbol} 24h change`,value:fmtOptionalPercent(a?.change24h),detail:`Observed at ${d.toISOString()} · source timestamp ${a?.observedAt??"not supplied"}.`,source},{label:`${symbol} price`,value:money(a?.price,a?.price<1?4:2),detail:"Quote currency USD · source value captured when the thesis was recorded.",source},{label:"Market capitalization",value:amountLabel(a?.marketCap),detail:"CMC-reported market capitalization at the baseline capture.",source},{label:"Research context",value:a?.peers||"Market",detail:"Peer context is shown as a prompt for investigation, not as a prediction."}],reviews:[]};
    state.theses.unshift(t);saveTheses();renderThesisCards();closeModal();toast("Thesis saved with a dated evidence snapshot.");
  });
}

function showThesis(id) {
  const t=state.theses.find(x=>x.id===id);if(!t)return;
  const evidence=(t.evidence||[]).map(e=>`<div class="evidence-row"><i></i><div><strong>${escapeHtml(e.label)} <span style="color:var(--lime);font-family:var(--mono);font-weight:400">${escapeHtml(e.value)}</span></strong><small>${escapeHtml(e.detail)} Source: ${escapeHtml(e.source)}.</small></div></div>`).join("");
  const review=(t.reviews||[]).map(r=>`<div class="evidence-row"><i style="background:var(--blue)"></i><div><strong>Review · ${safeDate(r.date)} <span style="color:var(--blue);font-family:var(--mono);font-weight:400">${escapeHtml(r.result||"Observation")}</span></strong><small>${escapeHtml(r.note)}</small>${r.snapshot?.derivedMetrics?.priceChangeSinceBaselinePct!==null&&r.snapshot?.derivedMetrics?.priceChangeSinceBaselinePct!==undefined?`<small>Price change since baseline: ${fmtPercent(r.snapshot.derivedMetrics.priceChangeSinceBaselinePct)} · ${escapeHtml(r.snapshot.sourceProvider||"source unavailable")}</small>`:""}${r.snapshot?.comparisonReplay?`<small>Saved comparison replay: ${r.snapshot.comparisonReplay.availableAssets}/${r.snapshot.comparisonReplay.replayedAssets} live quotes · equal-weight peer mean relative to ${escapeHtml(r.snapshot.comparisonReplay.benchmarkSymbol||"primary asset")}: ${r.snapshot.comparisonReplay.cohortRelativePct===null?"—":fmtPercent(r.snapshot.comparisonReplay.cohortRelativePct)+" pp"}</small>`:""}</div></div>`).join("");
  const due=t.status!=="reviewed"&&new Date(t.reviewAt)<=new Date();
  const hasCmcSource=(t.evidence||[]).some(item=>/coinmarketcap|cmc/i.test(String(item.source||"")))||/coinmarketcap|cmc/i.test(String(t.baselineSnapshot?.sourceProvider||""))||!!t.baselineSnapshot?.comparison;
  const cmcAttribution=hasCmcSource?`<div class="detail-note footer-attribution">CMC market data provided by <a href="https://coinmarketcap.com/" target="_blank" rel="noreferrer">CoinMarketCap.com</a>.</div>`:"";
  openModal(`<div class="modal-head"><div><div class="panel-kicker">${escapeHtml(t.assetSymbol||"MARKET")} · ${escapeHtml(statusLabel(t).toUpperCase())}</div><h2 id="modal-title">${escapeHtml(t.title)}</h2><p>Logged ${safeDate(t.createdAt)} · Review ${safeDate(t.reviewAt)}</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content"><div class="detail-section"><h3>THE VIEW AT THE TIME</h3><div class="detail-note">${escapeHtml(t.view||"No written explanation added yet.")}${t.condition?`<br/><br/><strong style="color:var(--text-2)">Condition to revisit:</strong> ${escapeHtml(t.condition)}`:""}</div></div><div class="detail-section"><h3>ORIGINAL EVIDENCE · PRESERVED</h3><div class="detail-evidence">${evidence||"<div class='detail-note'>No evidence snapshot attached.</div>"}</div></div>${savedComparisonMarkup(t.baselineSnapshot?.comparison)}${(t.additionalBaselines||[]).map(item=>`<div class="detail-section"><h3>ALTERNATE BASELINE PRESERVED</h3><div class="detail-note">A second baseline was found during account sync. The cloud-linked baseline remains canonical; this local snapshot has been preserved separately as additional evidence · ${escapeHtml(item.id)}</div>${savedComparisonMarkup(item.baselineSnapshot?.comparison)}</div>`).join("")}${t.syncConflict?`<div class="detail-section"><h3>SYNC CONFLICT NOTE</h3><div class="detail-note">The ${t.syncConflict.kept==="remote"?"newer cloud":"newer local"} version was kept. The alternate version remains in this device’s saved record: <strong>${escapeHtml(t.syncConflict.alternate?.title||"Untitled")}</strong> · ${escapeHtml(t.syncConflict.alternate?.updatedAt||"timestamp unavailable")}.</div></div>`:""}${review?`<div class="detail-section"><h3>REVIEW HISTORY</h3><div class="detail-evidence">${review}</div></div>`:""}${cmcAttribution}<div class="detail-actions"><button class="danger-button" id="delete-thesis">Delete record</button><div><button class="primary-button" id="review-thesis">${due?"Review this thesis":"Add another review"} <span>→</span></button></div></div></div>`);
  document.getElementById("delete-thesis").addEventListener("click",async()=>{if(!window.confirm("Delete this research record and its synced evidence?"))return;const owner=state.auth.user?.id||null,epoch=state.auth.sessionEpoch,token=state.auth.session?.access_token;try{if(owner)await sbRequest("/rest/v1/theses?id=eq."+encodeURIComponent(id),{method:"DELETE",token});if(state.auth.sessionEpoch!==epoch||(state.auth.user?.id||null)!==owner)return;state.theses=state.theses.filter(x=>x.id!==id);saveTheses(false);renderThesisCards();closeModal();toast("Research record deleted.");}catch{if(state.auth.sessionEpoch===epoch&&(state.auth.user?.id||null)===owner)toast("The record could not be deleted from your synced workspace.",true);}});
  const rb=document.getElementById("review-thesis"); if(rb)rb.addEventListener("click",()=>reviewThesis(id));
}

async function reviewThesis(id) {
  const t=state.theses.find(x=>x.id===id);if(!t)return;
  const isLive=state.data.mode==="live"&&/^\d{1,12}$/.test(String(t.assetId||""));
  const loading=`<div class="modal-head"><div><div class="panel-kicker">ADD A DATED OBSERVATION</div><h2 id="modal-title">Review your thesis</h2><p>Keeping the original snapshot unchanged while checking the latest source.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-note">${isLive?"Retrieving a fresh CoinMarketCap quote…":"This record is in demo mode; no live quote will be used."}</div>`;
  openModal(loading);
  let response=null;
  if(isLive){try{const r=await fetch(`/api/market?view=asset&id=${encodeURIComponent(t.assetId)}`,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("Fresh market quote unavailable");response=await r.json();state.latestSourceReceipts=Array.isArray(response.sourceReceipts)?response.sourceReceipts:[];}catch{response=null;}}
  const live=!!(isLive&&response?.asset&&String(response.asset.id)===String(t.assetId)&&hasNumericValue(response.asset.price));
  const current=live?response.asset:(state.data.mode==="demo"?(state.data.assets.find(a=>String(a.id)===String(t.assetId)||a.symbol===t.assetSymbol)||null):null);
  const comparisonReplay=await captureComparisonReplay(t,isLive,response);
  const baseline=t.baselineSnapshot||{};
  const baselineMetrics=baseline.metrics||{};
  const parseMetric=value=>{if(value===null||value===undefined||value==="")return null;const n=Number(String(value).replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:null;};
  const baselinePrice=baselineMetrics.price!==null&&baselineMetrics.price!==undefined&&Number.isFinite(Number(baselineMetrics.price))?Number(baselineMetrics.price):parseMetric(t.evidence?.find(x=>x.label===`${t.assetSymbol} price`)?.value);
  const baselineCap=baselineMetrics.marketCap!==null&&baselineMetrics.marketCap!==undefined&&Number.isFinite(Number(baselineMetrics.marketCap))?Number(baselineMetrics.marketCap):parseMetric(t.evidence?.find(x=>x.label==="Market capitalization")?.value);
  const currentPrice=current?.price??null,currentCap=current?.marketCap??null;
  const baselineProvider=baseline.sourceProvider||null;
  const reviewProvider=live?"coinmarketcap":state.data.mode==="demo"?"demo":"unavailable";
  const sameProvider=!!baselineProvider&&baselineProvider===reviewProvider;
  const priceDelta=sameProvider&&hasNumericValue(currentPrice)&&hasNumericValue(baselinePrice)&&Number(baselinePrice)!==0?((Number(currentPrice)-Number(baselinePrice))/Number(baselinePrice))*100:null;
  const capturedAt=new Date().toISOString();
  const observedAt=live?(response.source?.observedAt??current.observedAt??null):null;
  const currentLabel=live?"LATEST CMC QUOTE":state.data.mode==="demo"?"DEMO PREVIEW":"LATEST QUOTE UNAVAILABLE";
  const snapshot={sourceProvider:reviewProvider,retrievedAt:live?(response.retrievedAt||null):null,sourceEndpoint:live?"/v3/cryptocurrency/quotes/latest":null,sourceObservedAt:observedAt,capturedAt,currency:"USD",coverage:live?"partial":"unavailable",limitations:!sameProvider?"Source does not match the original baseline; no price delta is derived.":live?"Current quote compared with the preserved baseline; this is not a thesis score.":"No live source was available for this review.",metrics:{price:currentPrice,marketCap:currentCap,change24h:current?.change24h??null,volume24h:current?.volume24h??null},derivedMetrics:{priceChangeSinceBaselinePct:priceDelta},baselineSnapshotId:t.baselineSnapshotId||null};
  const baselineLabel=baseline.capturedAt||t.createdAt;
  const formatPrice=value=>value===null||value===undefined?"—":money(Number(value),Number(value)<1?4:2);
  const formatCap=value=>value===null||value===undefined?"—":amountLabel(Number(value));
  const snapshotView=`<div class="detail-section"><h3>BASELINE VS REVIEW SNAPSHOT</h3><div class="review-snapshot-grid"><div class="review-snapshot-cell"><small>ORIGINAL BASELINE</small><strong>${formatPrice(baselinePrice)}</strong><span>Price · USD</span><small>Captured ${safeDate(baselineLabel)}</small><strong>${formatCap(baselineCap)}</strong><span>Market cap</span></div><div class="review-snapshot-cell"><small>${currentLabel}</small><strong>${formatPrice(currentPrice)}</strong><span>Price · USD</span><small>${live&&observedAt?`Source updated ${safeDate(observedAt)}`:live?`Retrieved ${safeDate(capturedAt)}`:"Illustrative values only"}</small><strong>${formatCap(currentCap)}</strong><span>Market cap</span></div></div><div class="detail-note">${priceDelta===null?"A price change could not be calculated from the saved baseline.":`Price change since baseline: ${fmtPercent(priceDelta)}.`} ${live?"A quote change is evidence for your review, not a prediction.":"No live CMC evidence is attached to this review."}</div></div>`;
  openModal(`<div class="modal-head"><div><div class="panel-kicker">${escapeHtml(t.assetSymbol||"MARKET")} · ADD A DATED OBSERVATION</div><h2 id="modal-title">Review your thesis</h2><p>The baseline stays frozen. Record what the latest evidence means to you.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content">${snapshotView}${comparisonReplayMarkup(comparisonReplay)}<form class="thesis-form" id="review-form"><div class="field"><label for="review-result">HOW DOES THE VIEW LOOK TODAY?</label><select id="review-result"><option value="Still supported">Still supported</option><option value="Mixed evidence">Mixed evidence</option><option value="Weakened">Weakened</option><option value="No longer relevant">No longer relevant</option></select></div><div class="field"><label for="review-note">WHAT CHANGED?</label><textarea id="review-note" required maxlength="500" placeholder="Compare today's evidence with the original baseline..."></textarea><span class="field-help">${live?`Source: CoinMarketCap · ${escapeHtml(observedAt?new Date(observedAt).toLocaleString():new Date(capturedAt).toLocaleString())}. `:state.data.mode==="demo"?"Demo values only; no current CMC quote was captured. ":"The current CMC quote could not be retrieved. "}CMC Lens records your interpretation without scoring it as a prediction.</span></div><div class="form-actions"><button type="button" class="form-cancel" id="review-cancel">Cancel</button><button type="submit" class="primary-button">Append review <span>→</span></button></div></form></div>`);
  document.getElementById("review-cancel").addEventListener("click",()=>showThesis(id));
  document.getElementById("review-form").addEventListener("submit",e=>{e.preventDefault();const result=document.getElementById("review-result").value;const note=document.getElementById("review-note").value.trim();snapshot.comparisonReplay=comparisonReplay;t.reviews.push({id:crypto.randomUUID(),snapshotId:crypto.randomUUID(),date:capturedAt,result,note,snapshot});t.status="reviewed";t.lastReviewedAt=capturedAt;t.updatedAt=capturedAt;saveTheses();renderThesisCards();closeModal();toast("Review appended with its source snapshot.");});
}
function showAsset(symbol) {
  const a=assetBySymbol(symbol);if(!a)return;
  state.currentAsset=a;
  const movementNote=a.note || `${a.symbol} has a ${hasNumericValue(a.change24h)?(Number(a.change24h)>=0?"positive":"negative"):"unknown"} reported 24-hour change.`;
  openModal(`<div class="modal-head"><div><div class="panel-kicker">ASSET DOSSIER · ${escapeHtml(a.symbol)}</div><h2 id="modal-title">${escapeHtml(a.name)}</h2><p>Source context and peer movement, kept together.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content"><div class="detail-metric-row"><div class="detail-metric"><small>PRICE · USD</small><strong>${money(a.price, a.price<1?4:2)}</strong></div><div class="detail-metric"><small>24H CHANGE</small><strong style="color:${!hasNumericValue(a.change24h)?"var(--quiet)":Number(a.change24h)>=0?"var(--lime)":"var(--red)"}">${fmtOptionalPercent(a.change24h)}</strong></div><div class="detail-metric"><small>MARKET CAP</small><strong>${amountLabel(a.marketCap)}</strong></div></div><div class="detail-section"><h3>WHAT TO LOOK AT</h3><div class="detail-evidence"><div class="evidence-row"><i></i><div><strong>${escapeHtml(movementNote)}</strong><small>${escapeHtml(a.symbol)} is ${hasNumericValue(a.change24h)?(Number(a.change24h)>=0?"up":"down"):""} ${(hasNumericValue(a.change24h)?Math.abs(Number(a.change24h)).toFixed(2):"—")}% over 24 hours. Peer context: ${escapeHtml(a.peers)}.</small></div></div><div class="evidence-row"><i style="background:var(--blue)"></i><div><strong>Volume context</strong><small>24h reported volume ${amountLabel(a.volume24h)}. Volume alone does not establish direction or cause.</small></div></div></div></div><div class="detail-section"><h3>RESEARCH LIMIT</h3><div class="detail-note">${state.data.mode==="live"?"Live CMC market data. Check the source timestamp before comparing." : "Demo values for interface preview only. These figures are illustrative and must not be relied on as current market data."}</div></div><div class="detail-actions"><span class="footer-attribution">Data provided by <a href="https://coinmarketcap.com/" target="_blank" rel="noreferrer">CoinMarketCap.com</a></span><div><button class="primary-button" id="asset-thesis">Start a thesis <span>→</span></button></div></div></div>`);
  document.getElementById("asset-thesis").addEventListener("click",()=>{closeModal();setTimeout(()=>thesisForm({assets:[a],primaryId:String(a.id)}),100);});
}

function renderExplore(filter="") {
  const host=document.getElementById("asset-results");if(!host)return;
  const q=filter.trim().toLowerCase();const rows=state.data.assets.filter(a=>!q||a.name.toLowerCase().includes(q)||a.symbol.toLowerCase().includes(q)||a.id===q).slice(0,8);
  if(!q){host.innerHTML="";return;}
  host.innerHTML=rows.map(a=>`<div class="asset-result" data-asset="${escapeHtml(a.symbol)}"><span class="coin-icon" style="--coin-bg:${a.color}20;--coin-fg:${a.color}">${escapeHtml(a.symbol.slice(0,1))}</span><span class="asset-cell"><span><span class="asset-name">${escapeHtml(a.name)}</span><small class="asset-symbol">${escapeHtml(a.symbol)}</small></span></span><span>${money(a.price,a.price<1?4:2)}</span><span class="move-value ${hasNumericValue(a.change24h)?(Number(a.change24h)>=0?"up":"down"):""}">${fmtOptionalPercent(a.change24h)}</span></div>`).join("")||`<div class="empty-theses">No matching asset in this ${state.data.mode==="live"?"search result":"demo sample"}.</div>`;
  host.querySelectorAll("[data-asset]").forEach(el=>el.addEventListener("click",()=>showAsset(el.dataset.asset)));
}

function renderComparePickerResults() {
  const host=document.getElementById("compare-search-results");if(!host)return;
  const q=state.comparePickerQuery.trim().toLowerCase();
  const rows=state.data.assets.filter(a=>!state.compareSymbols.some(selection=>String(compareAssetBySelection(selection)?.id)===String(a.id))&&(!q||a.name.toLowerCase().includes(q)||a.symbol.toLowerCase().includes(q)||String(a.id)===q)).slice(0,6);
  if(!rows.length){host.innerHTML=`<div class="compare-picker-empty">${state.data.mode==="live"&&q.length>=2?"Searching CoinMarketCap…":"No matching assets in the loaded list."}</div>`;return;}
  host.innerHTML=rows.map(a=>`<button class="compare-picker-option" data-compare-id="${escapeHtml(a.id)}"><span>${escapeHtml(a.name)}</span><small>${escapeHtml(a.symbol)} · ${money(a.price,a.price<1?4:2)}</small><b>＋</b></button>`).join("");
  host.querySelectorAll("[data-compare-id]").forEach(el=>el.addEventListener("click",()=>{if(state.compareSymbols.length>=4){toast("Compare up to four assets at a time.");return;}state.compareAssetCache[String(el.dataset.compareId)]=state.data.assets.find(a=>String(a.id)===String(el.dataset.compareId));state.compareSymbols.push(el.dataset.compareId);state.comparePickerOpen=false;state.comparePickerQuery="";renderCompare();loadCompareHistory();}));
}

function renderCompare() {
  normalizeCompareSelections();
  const assets=state.compareSymbols.map(compareAssetBySelection).filter(Boolean);
  const colors=["var(--lime)","var(--blue)","var(--orange)","var(--red)"];
  const addDisabled=assets.length>=4?" disabled aria-disabled=\"true\"":"";
  const picker=state.comparePickerOpen?`<div class="compare-picker"><input id="compare-asset-search" aria-label="Search assets to compare" placeholder="Search name or symbol" value="${escapeHtml(state.comparePickerQuery)}" autocomplete="off"/><div id="compare-search-results" class="compare-picker-results"></div></div>`:"";
  document.getElementById("compare-assets").innerHTML=assets.map((a,i)=>`<span class="compare-chip" style="--chip:${colors[i]}"><i></i>${escapeHtml(a.symbol)}<button data-remove-asset-id="${escapeHtml(a.id)}" aria-label="Remove ${escapeHtml(a.symbol)}">×</button></span>`).join("")+`<button class="compare-chip" id="compare-add"${addDisabled}>＋ Add asset</button>`+picker;
  document.getElementById("compare-legend").innerHTML=assets.map((a,i)=>`<span><i style="--chip:${colors[i]}"></i>${escapeHtml(a.symbol)}</span>`).join("");
  drawCompareChart(assets, colors);
  document.getElementById("compare-table").innerHTML=`<div class="compare-table-head"><span>ASSET</span><span>24H CHANGE</span><span>MARKET CAP</span><span>PEER CONTEXT</span></div>${assets.map((a,i)=>`<div class="compare-table-row"><span class="asset-cell"><i style="width:7px;height:7px;border-radius:50%;background:${colors[i]}"></i>${escapeHtml(a.name)} (${escapeHtml(a.symbol)})</span><span style="color:${!hasNumericValue(a.change24h)?"var(--quiet)":Number(a.change24h)>=0?"var(--lime)":"var(--red)"}">${fmtOptionalPercent(a.change24h)}</span><span>${amountLabel(a.marketCap)}</span><span>${escapeHtml(a.peers)}</span></div>`).join("")}`;
  document.querySelectorAll("[data-remove-asset-id]").forEach(el=>el.addEventListener("click",()=>{state.compareSymbols=state.compareSymbols.filter(x=>String(compareAssetBySelection(x)?.id)!==String(el.dataset.removeAssetId));renderCompare();loadCompareHistory();}));
  const add=document.getElementById("compare-add");
  if(add)add.addEventListener("click",()=>{if(state.compareSymbols.length>=4){toast("Compare up to four assets at a time.");return;}state.comparePickerOpen=!state.comparePickerOpen;state.comparePickerQuery="";renderCompare();if(state.comparePickerOpen){const input=document.getElementById("compare-asset-search");input.focus();renderComparePickerResults();}});
  const input=document.getElementById("compare-asset-search");
  if(input){let timer;input.addEventListener("input",()=>{state.comparePickerQuery=input.value;renderComparePickerResults();clearTimeout(timer);if(state.data.mode==="live"&&input.value.trim().length>=2)timer=setTimeout(()=>searchRemote(input.value.trim(),"compare"),450);});renderComparePickerResults();}
}

function drawCompareChart(assets, colors) {
  const host=document.getElementById("compare-chart");
  const key=`${state.comparePeriod}:${state.compareSymbols.join(",")}`;
  const cached=state.historicalCache[key];
  if(state.data.mode==="live"&&!cached){
    host.innerHTML=`<div class="category-empty">${state.historyPending[key]?"Loading matched CMC history…":"Historical quotes are being prepared when you open this view."}</div>`;
    document.getElementById("compare-footnote").textContent="Live comparison uses CMC quotes. The chart appears only when the matching historical series is available.";
    return;
  }
  const series=state.data.mode==="live"?cached:assets.map((a,idx)=>({symbol:a.symbol,series:demoSeries(a,idx)}));
  const all=series.flatMap(row=>row.series.map(p=>Number(p.price))).filter(Number.isFinite);
  if(!all.length){host.innerHTML=`<div class="category-empty">No historical quotes are available for this selection and period.</div>`;return;}
  const indexed=series.map(row=>({symbol:row.symbol,points:row.series.map(p=>Number(p.price)).filter(Number.isFinite).map(p=>row.series.length?p/(Number(row.series.find(q=>Number.isFinite(Number(q.price)))?.price)||p)*100:100)}));
  const min=Math.min(...indexed.flatMap(row=>row.points));const max=Math.max(...indexed.flatMap(row=>row.points));const range=Math.max(0.01,max-min);
  const lines=indexed.map((row,ai)=>{const pts=row.points.map((v,i)=>`${row.points.length>1?i/(row.points.length-1)*100:50},${66-(v-min)/range*56}`).join(" ");return `<polyline points="${pts}" fill="none" stroke="${colors[ai]}" stroke-width="2.25" vector-effect="non-scaling-stroke"/>`;}).join("");
  host.innerHTML=`<svg viewBox="0 0 100 70" preserveAspectRatio="none" aria-label="${state.data.mode==="live"?"CMC historical relative performance":"Illustrative demo relative performance"}">${lines}</svg>`;
  document.getElementById("compare-footnote").textContent=state.data.mode==="live"
    ? `Indexed to 100 at the start of the ${state.comparePeriod} window. CMC historical quotes · retrieved ${new Date(cached[0]?.retrievedAt||Date.now()).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}. Historical performance does not indicate future results.`
    : "Illustrative demo series only. Live mode uses CMC historical quotes. Historical performance does not indicate future results.";
}

function demoSeries(asset, index) {
  const count=state.comparePeriod==="7D"?8:state.comparePeriod==="30D"?16:24;
  const seed=[...asset.symbol].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
  return Array.from({length:count},(_,i)=>({timestamp:new Date(Date.now()-(count-1-i)*86400000).toISOString(),price:asset.price*(1+Math.sin((i+seed)*.73)*.035+Math.cos((i+seed)*.31)*.022+(i/(count-1)-.5)*asset.change24h/100*(state.comparePeriod==="7D"?2.2:4.5))}));
}

async function loadCompareHistory() {
  normalizeCompareSelections();
  if(state.data.mode!=="live")return;
  const key=`${state.comparePeriod}:${state.compareSymbols.join(",")}`;
  if(state.historicalCache[key]){state.latestSourceReceipts=[...new Map(state.historicalCache[key].flatMap(row=>row.sourceReceipts||[]).map(receipt=>[receipt.requestId,receipt])).values()];renderCompare();return;}
  if(state.historyPending[key])return;
  state.historyPending[key]=true;
  renderCompare();
  const rows=await Promise.all(state.compareSymbols.map(async symbol=>{
    const asset=compareAssetBySelection(symbol);if(!asset)return {symbol,series:[]};
    try{const r=await fetch(`/api/market?view=history&id=${encodeURIComponent(asset.id)}&period=${state.comparePeriod}`,{headers:{Accept:"application/json"}});const body=await r.json().catch(()=>({}));return {symbol,series:r.ok&&Array.isArray(body.series)?body.series:[],retrievedAt:body.retrievedAt,sourceReceipts:Array.isArray(body.sourceReceipts)?body.sourceReceipts:[]};}
    catch{return {symbol,series:[]};}
  }));
  state.historicalCache[key]=rows;delete state.historyPending[key];if(state.view==="compare"&&`${state.comparePeriod}:${state.compareSymbols.join(",")}`===key)state.latestSourceReceipts=[...new Map(rows.flatMap(row=>row.sourceReceipts||[]).map(receipt=>[receipt.requestId,receipt])).values()];
  if(state.view==="compare"&&`${state.comparePeriod}:${state.compareSymbols.join(",")}`===key)renderCompare();
}

async function refreshData() {
  const b=document.getElementById("refresh-data");b.disabled=true;b.innerHTML='<span class="refresh-symbol">↻</span> Updating…';
  try { const r=await fetch("/api/market?view=overview",{headers:{Accept:"application/json"}}); const d=await r.json(); state.latestSourceReceipts=Array.isArray(d?.sourceReceipts)?d.sourceReceipts:[]; if(!r.ok)throw new Error("Market data request failed"); if(!d||!d.global||!Array.isArray(d.assets))throw new Error("Unexpected market response"); state.data=d;render();toast(d.mode==="live"?"Market context refreshed from CoinMarketCap.":"Demo data refreshed. Live API is not configured."); }
  catch(e){if(state.data.mode==="live"){toast("Refresh failed. Keeping the last successful live dataset and its source labels.",true);render();}else{toast("Market data could not be refreshed. Showing the labelled demo dataset.",true);state.data=demoData;render();}}
  finally{b.disabled=false;b.innerHTML='<span class="refresh-symbol">↻</span> Refresh data';}
}

async function sbRequest(path, {method="GET",body,token,prefer,signal}={}) {
  const auth=state.auth;
  if(!auth.configured)throw new Error("Account sync is not configured yet.");
  const headers={apikey:auth.publishableKey,Authorization:`Bearer ${token||auth.session?.access_token||auth.publishableKey}`,Accept:"application/json"};
  if(body!==undefined)headers["Content-Type"]="application/json";
  if(prefer)headers.Prefer=prefer;
  const response=await fetch(`${auth.url.replace(/\/$/,"")}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal});
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
  if(!response.ok)throw new Error(data?.msg||data?.message||data?.error_description||"Supabase request failed.");
  return data;
}

async function authRequest(path,body) {
  const response=await fetch(`${state.auth.url.replace(/\/$/,"")}/auth/v1/${path}`,{method:"POST",headers:{apikey:state.auth.publishableKey,Authorization:`Bearer ${state.auth.publishableKey}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)});
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
  if(!response.ok)throw new Error(data?.msg||data?.message||data?.error_description||"Sign-in request failed.");
  return data;
}

function invalidateWorkspaceSync() {
  const auth=state.auth;
  auth.sessionEpoch++;
  auth.syncEpoch++;
  auth.syncJob?.controller.abort();
  auth.syncJob=null;
  auth.syncing=false;
  auth.syncRequested=false;
}

function setAuthSession(session) {
  const previousUserId=state.auth.user?.id||state.auth.session?.user?.id||null;
  const nextUserId=session.user?.id||null;
  if(previousUserId&&previousUserId!==nextUserId)invalidateWorkspaceSync();
  state.auth.session={...session,expires_at:session.expires_at||Math.floor(Date.now()/1000)+Number(session.expires_in||3600)};
  state.auth.user=session.user||null;
  localStorage.setItem("cmc-lens-session",JSON.stringify(state.auth.session));
  updateStorageStatus();
}

function updateStorageStatus(message) {
  const text=document.getElementById("storage-status"),button=document.getElementById("auth-action");
  if(!text||!button)return;
  if(!state.auth.configured){text.textContent="Local saves are active. Cloud sync is not configured.";button.textContent="Sync unavailable";button.disabled=true;return;}
  button.disabled=false;
  if(state.auth.user){text.textContent=message||`Signed in as ${state.auth.user.email||"your account"} · thesis records sync to your private workspace.`;button.textContent="Sign out";}
  else{text.textContent=message||"Saved in this browser. Sign in by email to sync your private thesis records.";button.textContent="Connect workspace";}
}

function chooseGuestImport(count,email) {
  return new Promise(resolve=>{
    let settled=false;
    const finish=choice=>{if(settled)return;settled=true;closeModal();resolve(choice);};
    openModal(`<div class="modal-head"><div><div class="panel-kicker">PRIVATE WORKSPACE SETUP</div><h2 id="modal-title">Bring over local research?</h2><p>${escapeHtml(email||"This account")} has a private cloud workspace. This browser has ${count} guest record${count===1?"":"s"}.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content"><div class="detail-note">Importing sends these records and their notes to this signed-in Supabase workspace. Choose Keep local to leave them in this browser without uploading them.</div><div class="guest-import-actions"><button class="quiet-button" id="guest-keep-local">Keep local only</button><button class="primary-button" id="guest-import">Import ${count} record${count===1?"":"s"}</button></div></div>`);
    document.getElementById("guest-import").addEventListener("click",()=>finish(true));
    document.getElementById("guest-keep-local").addEventListener("click",()=>finish(false));
    document.getElementById("modal-close").addEventListener("click",()=>finish(false));
    document.getElementById("modal-backdrop").addEventListener("click",e=>{if(e.target.id==="modal-backdrop")finish(false);});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")finish(false);});
  });
}

async function activateAccountWorkspace(user) {
  if(!user?.id) throw new Error("The signed-in account could not be identified.");
  const previousUserId=state.auth.user?.id||state.auth.session?.user?.id||null;
  if(previousUserId&&previousUserId!==user.id)invalidateWorkspaceSync();
  const activationEpoch=state.auth.sessionEpoch;
  state.auth.user=user;
  const accountKey=`cmc-lens-theses:${user.id}`;
  const setupKey=`cmc-lens-workspace-ready:${user.id}`;
  const accountExists=localStorage.getItem(accountKey)!==null;
  const guest=loadTheses();
  let account=loadTheses(accountKey);
  let importedGuest=false;
  if(!localStorage.getItem(setupKey)){
    if(!accountExists&&guest.length){
      const importGuest=await chooseGuestImport(guest.length,user.email);
      if(state.auth.sessionEpoch!==activationEpoch||state.auth.user?.id!==user.id)return;
      if(importGuest){
        importedGuest=true;
        const byId=new Map(account.map(t=>[t.id,t]));
        for(const t of guest)if(!byId.has(t.id))byId.set(t.id,t);
        account=[...byId.values()];
      }
    }
    if(state.auth.sessionEpoch!==activationEpoch||state.auth.user?.id!==user.id)return;
    localStorage.setItem(setupKey,"1");
  }
  if(state.auth.sessionEpoch!==activationEpoch||state.auth.user?.id!==user.id)return;
  state.theses=account;
  localStorage.setItem(accountKey,JSON.stringify(account));
  if(importedGuest)localStorage.removeItem("cmc-lens-theses");
  renderThesisCards();
}

async function bootstrapAuth() {
  try{
    const response=await fetch("/api/health",{headers:{Accept:"application/json"}});
    if(!response.ok)throw new Error("Configuration unavailable");
    const config=await response.json();
    if(config.supabase?.configured){state.auth.configured=true;state.auth.url=config.supabase.url;state.auth.publishableKey=config.supabase.publishableKey;}
    const saved=localStorage.getItem("cmc-lens-session");
    if(saved){try{state.auth.session=JSON.parse(saved);}catch{localStorage.removeItem("cmc-lens-session");}}
    await handleAuthCallback();
    if(state.auth.session?.access_token){
      const epoch=state.auth.sessionEpoch,token=state.auth.session.access_token;
      try{const user=await sbRequest("/auth/v1/user",{token});if(state.auth.sessionEpoch===epoch&&state.auth.session?.access_token===token)await activateAccountWorkspace(user);}
      catch{if(state.auth.sessionEpoch===epoch&&state.auth.session?.access_token===token){await refreshAuthSession();if(state.auth.user)await activateAccountWorkspace(state.auth.user);}}
    }
    updateStorageStatus();
    if(state.auth.user)await syncWorkspace();
  }catch{updateStorageStatus();}
}

async function refreshAuthSession(){
  const refresh=state.auth.session?.refresh_token;if(!refresh)return;
  const epoch=state.auth.sessionEpoch;
  try{
    const session=await authRequest("token?grant_type=refresh_token",{refresh_token:refresh});
    if(state.auth.sessionEpoch!==epoch||state.auth.session?.refresh_token!==refresh)return;
    setAuthSession(session);
  }catch{
    if(state.auth.sessionEpoch!==epoch||state.auth.session?.refresh_token!==refresh)return;
    invalidateWorkspaceSync();state.auth.session=null;state.auth.user=null;localStorage.removeItem("cmc-lens-session");state.theses=loadTheses();renderThesisCards();updateStorageStatus("Signed out · guest records remain in this browser.");
  }
}

async function handleAuthCallback(){
  const url=new URL(location.href),hash=new URLSearchParams(location.hash.slice(1));
  const tokenHash=url.searchParams.get("token_hash"),type=url.searchParams.get("type");
  if(tokenHash&&["signup","magiclink","email"].includes(type)){
    const session=await authRequest("verify",{token_hash:tokenHash,type});setAuthSession(session);url.searchParams.delete("token_hash");url.searchParams.delete("type");history.replaceState({},"",url.pathname+url.search+url.hash);toast("Email verified. Your workspace is connected.");
  }else if(hash.get("access_token")&&hash.get("refresh_token")){
    setAuthSession({access_token:hash.get("access_token"),refresh_token:hash.get("refresh_token"),expires_in:hash.get("expires_in"),user:null});
    history.replaceState({},"",url.pathname+url.search);
  }
}

function authForm(step="email"){
  const email=state.auth.pendingEmail||"";
  openModal(`<div class="modal-head"><div><div class="panel-kicker">PRIVATE RESEARCH WORKSPACE</div><h2 id="modal-title">${step==="email"?"Connect your workspace":"Check your email"}</h2><p>${step==="email"?"Use a secure email link to sync your thesis records across devices.":`We sent a sign-in message to ${escapeHtml(email)}. Enter its code, or open the link in the email.`}</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><form class="thesis-form" id="auth-form">${step==="email"?`<div class="field"><label for="auth-email">EMAIL ADDRESS</label><input id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required /></div>`:`<div class="field"><label for="auth-code">EMAIL CODE</label><input id="auth-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Enter the code from your email" required /></div>`}<div class="form-actions"><button type="button" class="form-cancel" id="auth-cancel">Cancel</button><button type="submit" class="primary-button">${step==="email"?"Send sign-in email":"Verify and sync"} <span>→</span></button></div></form>`);
  document.getElementById("auth-cancel").addEventListener("click",closeModal);
  document.getElementById("auth-form").addEventListener("submit",async e=>{
    e.preventDefault();const submit=e.currentTarget.querySelector('[type="submit"]');submit.disabled=true;
    try{
      if(step==="email"){
        const address=new FormData(e.currentTarget).get("email").trim().toLowerCase();
        await authRequest(`otp?redirect_to=${encodeURIComponent(`${location.origin}/`)}`,{email:address,create_user:true});
        state.auth.pendingEmail=address;toast("Sign-in email sent.");authForm("code");
      }else{
        const code=new FormData(e.currentTarget).get("code").trim();
        const session=await authRequest("verify",{email:state.auth.pendingEmail,token:code,type:"email"});
        setAuthSession(session);const epoch=state.auth.sessionEpoch,token=state.auth.session?.access_token;state.auth.pendingEmail=null;closeModal();if(!token)throw new Error("The sign-in session did not include an access token.");const user=await sbRequest("/auth/v1/user",{token});if(state.auth.sessionEpoch!==epoch||state.auth.session?.access_token!==token)return;await activateAccountWorkspace(user);if(state.auth.sessionEpoch!==epoch||state.auth.session?.access_token!==token)return;await syncWorkspace();if(state.auth.sessionEpoch!==epoch||state.auth.session?.access_token!==token)return;updateStorageStatus();toast("Workspace connected. Your account records are syncing.");
      }
    }catch(error){toast(error.message||"Sign-in could not be completed.",true);submit.disabled=false;}
  });
}

function resolveThesisSyncConflict(thesis,remote){
  if(!remote)return "local";
  const fields={title:thesis.title,thesis_text:thesis.view||"",review_at:thesis.reviewAt||null,primary_asset_id:thesis.assetId||null,primary_asset_symbol:thesis.assetSymbol||null,status:thesis.status||"open"};
  const remoteFields={title:remote.title,thesis_text:remote.thesis_text||"",review_at:remote.review_at||null,primary_asset_id:remote.primary_asset_id||null,primary_asset_symbol:remote.primary_asset_symbol||null,status:remote.status||"open"};
  const differs=Object.keys(fields).some(key=>String(fields[key]??"")!==String(remoteFields[key]??""));
  const localTime=Date.parse(thesis.updatedAt||thesis.lastReviewedAt||thesis.createdAt||"")||0;
  const remoteTime=Date.parse(remote.updated_at||remote.created_at||"")||0;
  if(!differs)return "local";
  const localDraft={title:fields.title,view:fields.thesis_text,reviewAt:fields.review_at,assetId:fields.primary_asset_id,assetSymbol:fields.primary_asset_symbol,updatedAt:thesis.updatedAt||thesis.createdAt};
  const remoteDraft={title:remoteFields.title,view:remoteFields.thesis_text,reviewAt:remoteFields.review_at,assetId:remoteFields.primary_asset_id,assetSymbol:remoteFields.primary_asset_symbol,updatedAt:remote.updated_at||remote.created_at};
  if(remoteTime>=localTime){
    thesis.syncConflict={kept:"remote",detectedAt:new Date().toISOString(),alternate:localDraft};
    thesis.title=remoteFields.title;thesis.view=remoteFields.thesis_text;thesis.reviewAt=remoteFields.review_at;thesis.assetId=remoteFields.primary_asset_id;thesis.assetSymbol=remoteFields.primary_asset_symbol;thesis.status=remoteFields.status;thesis.updatedAt=remote.updated_at||remote.created_at;
    return "remote";
  }
  thesis.syncConflict={kept:"local",detectedAt:new Date().toISOString(),alternate:remoteDraft};
  return "local";
}
function reconcileConditionForSync(thesis,remoteCondition){
  if(!remoteCondition)return "local";
  const local=String(thesis.condition||""),remote=String(remoteCondition.description||"");
  const localActive=thesis.conditionActive===undefined?!!local:!!thesis.conditionActive;
  const remoteActive=remoteCondition.active===true;
  thesis.conditionId=remoteCondition.id;
  if(local===remote&&localActive===remoteActive){thesis.conditionActive=remoteActive;return "same";}
  const localTime=Date.parse(thesis.updatedAt||thesis.lastReviewedAt||thesis.createdAt||"")||0;
  const remoteTime=Date.parse(remoteCondition.updated_at||remoteCondition.created_at||"")||0;
  if(remoteTime>=localTime){thesis.syncConflict={kept:"remote",detectedAt:new Date().toISOString(),alternate:{title:thesis.title,condition:local,conditionActive:localActive,updatedAt:thesis.updatedAt||thesis.createdAt}};thesis.condition=remoteActive?remote:"";thesis.conditionActive=remoteActive;return "remote";}
  thesis.syncConflict={kept:"local",detectedAt:new Date().toISOString(),alternate:{title:thesis.title,condition:remote,conditionActive:remoteActive,updatedAt:remoteCondition.updated_at||remoteCondition.created_at}};
  thesis.conditionActive=localActive;
  return "local";
}
function reconcileThesisHistory(localTheses,remoteTheses,evidenceRows,reviewRows,snapshotRows,conditionRows){
  const records=new Map((localTheses||[]).map(t=>[t.id,t]));
  const remoteById=new Map((remoteTheses||[]).map(row=>[row.id,row]));
  const snapshotById=new Map((snapshotRows||[]).map(row=>[row.id,row]));
  for(const row of remoteTheses||[]){
    if(records.has(row.id))continue;
    records.set(row.id,{id:row.id,title:row.title,view:row.thesis_text,assetId:row.primary_asset_id,assetSymbol:row.primary_asset_symbol,createdAt:row.created_at,reviewAt:row.review_at,updatedAt:row.updated_at,status:row.status,baselineSnapshotId:row.baseline_snapshot_id,baselineSnapshot:null,condition:"",conditionId:null,evidence:[],reviews:[]});
  }
  for(const thesis of records.values()){
    const remote=remoteById.get(thesis.id);
    const baseline=remote?.baseline_snapshot_id?snapshotById.get(remote.baseline_snapshot_id):null;
    const localBaselineId=thesis.baselineSnapshotId||null;
    const localBaseline=thesis.baselineSnapshot||null;
    if(remote?.baseline_snapshot_id&&localBaselineId&&String(remote.baseline_snapshot_id)!==String(localBaselineId)&&localBaseline){thesis.additionalBaselines||=[];if(!thesis.additionalBaselines.some(item=>item.id===localBaselineId))thesis.additionalBaselines.push({id:localBaselineId,baselineSnapshot:localBaseline});}
    if(remote?.baseline_snapshot_id){thesis.baselineSnapshotId=remote.baseline_snapshot_id;if(baseline?.source_payload?.baseline)thesis.baselineSnapshot=baseline.source_payload.baseline;else if(String(remote.baseline_snapshot_id)!==String(localBaselineId))thesis.baselineSnapshot=null;}else thesis.baselineSnapshotId||=null;
    thesis.additionalBaselines ||= [];
    for(const snapshot of snapshotRows||[]){if(snapshot.thesis_id!==thesis.id||snapshot.snapshot_kind!=="baseline"||snapshot.id===thesis.baselineSnapshotId)continue;const baselineSnapshot=snapshot.source_payload?.baseline||null;if(!baselineSnapshot||thesis.additionalBaselines.some(item=>item.id===snapshot.id))continue;thesis.additionalBaselines.push({id:snapshot.id,baselineSnapshot});}
    if(!thesis.updatedAt&&remote?.updated_at)thesis.updatedAt=remote.updated_at;
    const evidence=[...(thesis.evidence||[])];
    const evidenceIds=new Set(evidence.map(item=>item.id).filter(Boolean));
    for(const row of evidenceRows||[]){
      if(row.thesis_id!==thesis.id||evidenceIds.has(row.id)||(thesis.baselineSnapshotId&&row.snapshot_id!==thesis.baselineSnapshotId))continue;
      const sourceSnapshot=snapshotById.get(row.snapshot_id);
      evidence.push({id:row.id,label:row.label||"Evidence",value:row.value_text||"",detail:row.detail||"",source:sourceSnapshot?.source_provider==="coinmarketcap"?"CoinMarketCap":"Synced evidence",sourceTimestamp:row.source_timestamp||null,sourceUrl:row.source_url||null,kind:row.kind||"metric",unit:row.unit||null,direction:row.direction||"neutral"});
      evidenceIds.add(row.id);
    }
    thesis.evidence=evidence;
    const reviews=[...(thesis.reviews||[])];
    const reviewIds=new Set(reviews.map(item=>item.id).filter(Boolean));
    for(const row of reviewRows||[]){
      if(row.thesis_id!==thesis.id||reviewIds.has(row.id))continue;
      const snapshot=snapshotById.get(row.snapshot_id);
      reviews.push({id:row.id,date:row.reviewed_at,result:row.result_label,note:row.summary||"",snapshotId:row.snapshot_id,snapshot:snapshot?.source_payload?.review||null});
      reviewIds.add(row.id);
    }
    reviews.sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    thesis.reviews=reviews;
    const latestReview=reviews.reduce((latest,review)=>!latest||new Date(review.date||0)>new Date(latest)?review.date:latest,null);
    if(latestReview){thesis.lastReviewedAt=latestReview;if(thesis.status!=="reviewed")thesis.status="reviewed";}
    const condition=(conditionRows||[]).filter(row=>row.thesis_id===thesis.id).reduce((latest,row)=>!latest||Date.parse(row.updated_at||row.created_at||"")>Date.parse(latest.updated_at||latest.created_at||"")?row:latest,null);if(condition){thesis.condition=condition.active?(condition.description||""):"";thesis.conditionId=condition.id;thesis.conditionActive=condition.active===true;}
  }
  return [...records.values()].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
}
async function syncWorkspace(){
  const auth=state.auth;
  if(!auth.user?.id||!auth.session?.access_token)return;
  if(auth.syncJob){auth.syncRequested=true;return;}
  const owner=auth.user.id,token=auth.session.access_token,epoch=auth.syncEpoch;
  const job={owner,epoch,controller:new AbortController()};
  auth.syncJob=job;auth.syncing=true;
  const theses=[...state.theses];
  const assertCurrent=()=>{if(auth.syncJob!==job||auth.syncEpoch!==epoch||auth.user?.id!==owner||job.controller.signal.aborted)throw new DOMException("Workspace sync was superseded.","AbortError");};
  const request=(path,options={})=>{assertCurrent();return sbRequest(path,{...options,token,signal:job.controller.signal});};
  const insertOnly="resolution=ignore-duplicates,return=minimal";
  const fetchAllRows=async path=>{const all=[];let cursor=null;for(;;){const after=cursor?`&id=gt.${encodeURIComponent(cursor)}`:"";const page=await request(`${path}${after}&order=id.asc&limit=500`);if(Array.isArray(page))all.push(...page);if(!Array.isArray(page)||page.length<500)break;const next=page[page.length-1]?.id;if(!next||next===cursor)break;cursor=next;}return all;};
  try{
    const remoteAtStart=await fetchAllRows(`/rest/v1/theses?select=*&owner_id=eq.${encodeURIComponent(owner)}`);
    const remoteAtStartById=new Map((remoteAtStart||[]).map(row=>[row.id,row]));
    const remoteConditionRows=[];
    for(let offset=0;offset<remoteAtStart.length;offset+=50){const ids=remoteAtStart.slice(offset,offset+50).map(row=>row.id).filter(Boolean).join(",");if(ids)remoteConditionRows.push(...await fetchAllRows(`/rest/v1/thesis_conditions?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`));}
    const conditionByThesis=new Map();
    for(const row of remoteConditionRows){const current=conditionByThesis.get(row.thesis_id);if(!current||Date.parse(row.updated_at||row.created_at||"")>Date.parse(current.updated_at||current.created_at||""))conditionByThesis.set(row.thesis_id,row);}
    for(const t of theses){
      const syncChoice=resolveThesisSyncConflict(t,remoteAtStartById.get(t.id));
      const remoteCondition=conditionByThesis.get(t.id);
      const conditionChoice=reconcileConditionForSync(t,remoteCondition);
      t.baselineSnapshotId ||= crypto.randomUUID();
      const thesis={id:t.id,owner_id:owner,title:t.title,question:"",thesis_text:t.view||"",status:["reviewed","due","archived"].includes(t.status)?t.status:"open",horizon_start:t.createdAt,review_at:t.reviewAt||null,primary_asset_id:t.assetId||null,primary_asset_symbol:t.assetSymbol||null,privacy:"private",created_at:t.createdAt,updated_at:t.updatedAt||t.lastReviewedAt||t.createdAt};
      if(syncChoice!=="remote")await request("/rest/v1/theses?on_conflict=id",{method:"POST",body:thesis,prefer:"resolution=merge-duplicates,return=minimal"});
      const source=t.evidence?.[0]?.source||"Demo dataset";
      const snapshot={id:t.baselineSnapshotId,owner_id:owner,thesis_id:t.id,snapshot_kind:"baseline",source_provider:t.baselineSnapshot?.sourceProvider||(source==="CoinMarketCap"?"coinmarketcap":"demo"),source_endpoint:t.baselineSnapshot?.sourceEndpoint??(source==="CoinMarketCap"?"/v3/cryptocurrency/quotes/latest":null),source_observed_at:t.baselineSnapshot?.sourceObservedAt??null,captured_at:t.baselineSnapshot?.capturedAt||t.createdAt,source_payload:{evidence:t.evidence||[],baseline:t.baselineSnapshot||null},derived_metrics:{assetSymbol:t.assetSymbol||null,peerContext:t.evidence?.find(x=>x.label==="Research context")?.value||null},coverage:source==="CoinMarketCap"?"complete":"partial",limitations:source==="CoinMarketCap"?"User-authored interpretation; source data is a compacted application snapshot.":"Illustrative demo values, not live market evidence."};
      await request("/rest/v1/thesis_snapshots?on_conflict=id",{method:"POST",body:snapshot,prefer:insertOnly});
      if(!remoteAtStartById.get(t.id)?.baseline_snapshot_id)await request(`/rest/v1/theses?id=eq.${encodeURIComponent(t.id)}`,{method:"PATCH",body:{baseline_snapshot_id:t.baselineSnapshotId},prefer:"return=minimal"});
      const evidence=(t.evidence||[]).map(item=>{item.id ||= crypto.randomUUID();return {id:item.id,owner_id:owner,thesis_id:t.id,snapshot_id:t.baselineSnapshotId,kind:item.kind||"metric",label:item.label,detail:item.detail||"",source_url:item.sourceUrl||null,source_timestamp:item.sourceTimestamp??null,value_text:item.value||null,unit:item.unit||null,direction:item.direction||"neutral"};});
      if(evidence.length)await request("/rest/v1/evidence_items?on_conflict=id",{method:"POST",body:evidence,prefer:insertOnly});
      if(conditionChoice==="local"&&(t.condition||remoteCondition)){const body={description:t.condition||"",active:t.conditionActive===undefined?!!t.condition:!!t.conditionActive,updated_at:new Date().toISOString()};if(remoteCondition)await request(`/rest/v1/thesis_conditions?id=eq.${encodeURIComponent(remoteCondition.id)}&owner_id=eq.${encodeURIComponent(owner)}`,{method:"PATCH",body,prefer:"return=minimal"});else if(t.condition){t.conditionId ||= crypto.randomUUID();await request("/rest/v1/thesis_conditions?on_conflict=id",{method:"POST",body:{id:t.conditionId,owner_id:owner,thesis_id:t.id,condition_type:"qualitative",metric_key:"user_defined",effect:"weaken",...body},prefer:"resolution=merge-duplicates,return=minimal"});}}
      for(const review of t.reviews||[]){review.id ||= crypto.randomUUID();review.snapshotId ||= crypto.randomUUID();await request("/rest/v1/thesis_snapshots?on_conflict=id",{method:"POST",body:{id:review.snapshotId,owner_id:owner,thesis_id:t.id,snapshot_kind:"manual_review",source_provider:review.snapshot?.sourceProvider||"unavailable",source_endpoint:review.snapshot?.sourceEndpoint||null,source_observed_at:review.snapshot?.sourceObservedAt??null,captured_at:review.snapshot?.capturedAt||review.date,source_payload:{assetSymbol:t.assetSymbol||null,retrievedAt:review.snapshot?.retrievedAt??null,review:review.snapshot||null},derived_metrics:review.snapshot?.derivedMetrics||{},coverage:review.snapshot?.coverage||"unavailable",limitations:review.snapshot?.limitations||"No fresh source snapshot was captured at review time."},prefer:insertOnly});await request("/rest/v1/thesis_reviews?on_conflict=id",{method:"POST",body:{id:review.id,owner_id:owner,thesis_id:t.id,snapshot_id:review.snapshotId,reviewed_at:review.date,result_label:review.result,summary:review.note||""},prefer:insertOnly});}
    }
    const remote=await fetchAllRows(`/rest/v1/theses?select=*&owner_id=eq.${encodeURIComponent(owner)}&order=created_at.desc,id.desc`);
    const history={evidence:[],reviews:[],snapshots:[],conditions:[]};
    const remoteRows=remote||[];
    for(let offset=0;offset<remoteRows.length;offset+=50){
      const group=remoteRows.slice(offset,offset+50);
      const ids=group.map(row=>row.id).filter(Boolean).join(",");
      if(!ids)continue;
      const filter=`/rest/v1/evidence_items?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`;
      const [evidence,reviews,snapshots,conditions]=await Promise.all([
        fetchAllRows(filter),
        fetchAllRows(`/rest/v1/thesis_reviews?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`),
        fetchAllRows(`/rest/v1/thesis_snapshots?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`),
        fetchAllRows(`/rest/v1/thesis_conditions?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})&active=eq.true`)
      ]);
      history.evidence.push(...(evidence||[]));history.reviews.push(...(reviews||[]));history.snapshots.push(...(snapshots||[]));history.conditions.push(...(conditions||[]));
    }
    const reconciled=reconcileThesisHistory(theses,remoteRows,history.evidence,history.reviews,history.snapshots,history.conditions);
    theses.splice(0,theses.length,...reconciled);
    assertCurrent();
    const latestById=new Map(theses.map(t=>[t.id,t]));for(const current of state.theses)latestById.set(current.id,current);const finalTheses=[...latestById.values()];
    localStorage.setItem("cmc-lens-theses:"+owner,JSON.stringify(finalTheses));
    state.theses=finalTheses;renderThesisCards();updateStorageStatus("Synced to Supabase · remote review history reconciled.");
  }finally{
    if(auth.syncJob===job){auth.syncJob=null;auth.syncing=false;if(auth.syncRequested){auth.syncRequested=false;syncWorkspace().catch(()=>updateStorageStatus("Saved locally · cloud sync will retry"));}}
  }
}

async function signOutWorkspace(){
  const token=state.auth.session?.access_token;
  invalidateWorkspaceSync();
  state.auth.session=null;state.auth.user=null;localStorage.removeItem("cmc-lens-session");state.theses=loadTheses();renderThesisCards();updateStorageStatus("Signed out · guest records remain in this browser.");
  try{if(token)await sbRequest("/auth/v1/logout",{method:"POST",token});}catch{}
}


function receiptTime(value){
  if(!value)return "Not supplied";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"Not supplied":date.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
}
function sourceReceiptMarkup(){
  const receipts=Array.isArray(state.latestSourceReceipts)?state.latestSourceReceipts:[];
  const live=state.data?.mode==="live";
  const cards=receipts.map(receipt=>{
    const params=Object.entries(receipt.params||{});
    const summary=JSON.stringify(receipt.responseSummary||{});
    const outcome=String(receipt.outcome||"unknown");
    return `<article class="receipt-card">
      <div class="receipt-head"><code>${escapeHtml(receipt.endpoint||"Unknown CMC endpoint")}</code><span class="receipt-status ${escapeHtml(outcome)}">${escapeHtml(outcome)}</span></div>
      <div class="receipt-meta"><span>${escapeHtml(receipt.method||"GET")} · ${escapeHtml(receipt.provider||"CoinMarketCap")}</span><span>Upstream HTTP ${escapeHtml(receipt.upstreamStatus??"—")}</span><span>Server cache ${escapeHtml(receipt.appCache?.status||"unknown")}</span></div>
      <div class="receipt-params"><strong>Safe request parameters</strong><code>${params.length?escapeHtml(params.map(([key,value])=>`${key}=${value}`).join(" · ")):"None"}</code></div>
      <dl class="receipt-times"><div><dt>Source observed</dt><dd>${escapeHtml(receiptTime(receipt.sourceObservedAt))}</dd></div><div><dt>Retrieved from CMC</dt><dd>${escapeHtml(receiptTime(receipt.appCache?.sourceRetrievedAt))}</dd></div><div><dt>Served by app</dt><dd>${escapeHtml(receiptTime(receipt.appCache?.servedAt))}</dd></div><div><dt>Records</dt><dd>${escapeHtml(receipt.recordCount??"—")}</dd></div></dl>
      <details class="receipt-summary"><summary>Normalized response summary</summary><pre>${escapeHtml(summary)}</pre></details>
    </article>`;
  }).join("");
  return `<div class="modal-head"><div><div class="panel-kicker">DATA CONNECTION · SOURCE RECEIPTS</div><h2 id="modal-title">Inspect the CMC source</h2><p>See the exact endpoint behind the latest market request and how fresh its data is.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content source-receipts"><div class="detail-note">${live?"This request reached the server-side market adapter. The receipt contains allowlisted parameters and normalized summary fields only; API credentials, headers, and raw CMC payloads are never sent to this view.":"Demo mode is active. These illustrative values do not represent a CoinMarketCap API response; no CMC request was made."}</div>${cards|| (live?"<div class=\"empty-state\">No CMC request receipt is available for this view yet. Refresh market data or search an asset.</div>":"")}</div>`;
}
function setup() {
  const savedTheme=localStorage.getItem("cmc-lens-theme");if(savedTheme==="light"||savedTheme==="dark")document.documentElement.dataset.theme=savedTheme;
  document.querySelectorAll("[data-view]").forEach(el=>el.addEventListener("click",()=>switchView(el.dataset.view)));
  document.getElementById("theme-toggle").addEventListener("click",()=>setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark"));
  document.querySelectorAll("[data-set-theme]").forEach(el=>el.addEventListener("click",()=>setTheme(el.dataset.setTheme)));
  document.querySelectorAll("[data-thesis-filter]").forEach(el=>el.addEventListener("click",()=>{state.activeFilter=el.dataset.thesisFilter;document.querySelectorAll("[data-thesis-filter]").forEach(x=>x.classList.toggle("selected",x===el));renderThesesPage();}));
  ["new-thesis","new-thesis-alt","explore-new-thesis","theses-new"].forEach(id=>document.getElementById(id).addEventListener("click",()=>thesisForm()));
  document.getElementById("compare-save-thesis").addEventListener("click",comparisonThesisForm);
  document.getElementById("atlas-category-filter").addEventListener("change",event=>{state.atlas.category=event.target.value;renderAtlas();});
  document.getElementById("atlas-cap-filter").addEventListener("change",event=>{state.atlas.cap=event.target.value;renderAtlas();});
  document.getElementById("atlas-hide-stablecoins").addEventListener("change",event=>{state.atlas.hideStablecoins=event.target.checked;renderAtlas();});
  document.getElementById("atlas-view-map").addEventListener("click",()=>{state.atlas.mode="map";renderAtlas();});
  document.getElementById("atlas-view-list").addEventListener("click",()=>{state.atlas.mode="list";renderAtlas();});
  document.getElementById("atlas-inspect-source").addEventListener("click",()=>openModal(sourceReceiptMarkup()));
  document.getElementById("atlas-compare-selection").addEventListener("click",()=>carryAtlasSelectionToCompare(false));
  document.getElementById("atlas-thesis-selection").addEventListener("click",()=>carryAtlasSelectionToCompare(true));
  document.getElementById("atlas-clear-selection").addEventListener("click",()=>{state.atlas.selected=[];renderAtlas();});
  document.getElementById("refresh-data").addEventListener("click",refreshData);
  document.getElementById("auth-action").addEventListener("click",()=>state.auth.user?signOutWorkspace():authForm());
  document.getElementById("demo-banner-close").addEventListener("click",()=>document.getElementById("demo-banner").hidden=true);
  document.getElementById("mobile-menu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
  const search=document.getElementById("asset-search");let searchTimer;search.addEventListener("input",()=>{renderExplore(search.value);clearTimeout(searchTimer);if(state.data.mode==="live"&&search.value.trim().length>=2)searchTimer=setTimeout(()=>searchRemote(search.value.trim()),450);});
  search.addEventListener("keydown",e=>{if(e.key==="Enter"){const a=state.data.assets.find(x=>x.name.toLowerCase().includes(search.value.toLowerCase())||x.symbol.toLowerCase()===search.value.toLowerCase());if(a)showAsset(a.symbol);}});
  document.getElementById("search-trigger").addEventListener("click",()=>{switchView("explore");setTimeout(()=>search.focus(),50)});
  document.getElementById("method-open").addEventListener("click",()=>openModal(`<div class="modal-head"><div><div class="panel-kicker">METHOD NOTE</div><h2 id="modal-title">Market breadth</h2><p>How the Market Pulse observation is assembled.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content"><div class="detail-note">Breadth is the count of tracked assets with a positive reported 24-hour price change, divided by the tracked asset set. The demo uses a small illustrative set. In live mode, the exact CMC response window and number of assets will be shown here. Breadth says how widely prices moved in one direction; it does not identify the cause or forecast the next move.</div></div>`));
  document.getElementById("connection-info").addEventListener("click",()=>openModal(sourceReceiptMarkup()));
  document.querySelectorAll("[data-period]").forEach(el=>el.addEventListener("click",()=>{state.comparePeriod=el.dataset.period;document.querySelectorAll("[data-period]").forEach(x=>x.classList.toggle("selected",x===el));renderCompare();loadCompareHistory();}));
  document.querySelectorAll(".info-dot").forEach(el=>el.title=el.dataset.tip);
  document.getElementById("open-breadth").addEventListener("click",()=>switchView("compare"));
  document.getElementById("notification-button").addEventListener("click",()=>{const due=state.theses.filter(t=>t.status!=="reviewed"&&new Date(t.reviewAt)<=new Date()).length;toast(due?`${due} ${due===1?"thesis is":"theses are"} ready for review.`:"No thesis reviews are due right now.");});
  document.getElementById("search-trigger").setAttribute("aria-label","Search assets and research");
  document.querySelectorAll(".panel-more,.chart-menu,.profile-more").forEach(el=>el.addEventListener("click",()=>toast("More workspace controls will be available with saved user settings.")));
  setTheme(document.documentElement.dataset.theme||"dark");
  render();
  updateStorageStatus();
  bootstrapAuth();
  // The server returns a labelled demo response if live CMC credentials are absent.
  refreshData();
}

async function searchRemote(q,target="explore"){
  try{const r=await fetch(`/api/market?view=search&q=${encodeURIComponent(q)}`,{headers:{Accept:"application/json"}});if(!r.ok)return;const body=await r.json();state.latestSourceReceipts=Array.isArray(body.sourceReceipts)?body.sourceReceipts:[];if(body.mode!=="live"||!Array.isArray(body.assets))return;const existing=new Set(state.data.assets.map(a=>String(a.id)));state.data.assets=[...state.data.assets,...body.assets.filter(a=>!existing.has(String(a.id)))];if(target==="compare")renderComparePickerResults();else renderExplore(document.getElementById("asset-search").value);}
  catch{ /* Keep the already-rendered search results usable if the API is unavailable. */ }
}

function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem("cmc-lens-theme",theme);document.getElementById("theme-toggle").setAttribute("aria-label",`Switch to ${theme==="dark"?"light":"dark"} theme`);document.querySelectorAll("[data-set-theme]").forEach(el=>el.classList.toggle("selected",el.dataset.setTheme===theme));}
document.addEventListener("DOMContentLoaded",setup);
document.addEventListener("keydown",e=>{
  if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();switchView("explore");setTimeout(()=>document.getElementById("asset-search").focus(),20);}
  if((e.metaKey||e.ctrlKey)&&["1","2","3","4"].includes(e.key)){e.preventDefault();switchView(({"1":"pulse","2":"explore","3":"compare","4":"atlas"})[e.key]);}
});
