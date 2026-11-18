const demoData = {
  mode: "demo",
  retrievedAt: "2026-11-18T13:30:00.000Z",
  global: { marketCap: 2.48e12, marketCapChange24h: 2.84, btcDominance: 54.8, btcDominanceChange24h: -0.36, breadth: 75, breadthCount: 6, breadthTotal: 8, sentiment: 62 },
  categories: [
    { name: "Layer 1", advancing: 82 }, { name: "DeFi", advancing: 74 }, { name: "AI & Data", advancing: 61 }, { name: "Gaming", advancing: 53 }, { name: "Meme", advancing: 39 }
  ],
  assets: [
    { id: "1", name: "Bitcoin", symbol: "BTC", price: 68342.18, change24h: 3.1, marketCap: 1.35e12, volume24h: 31.6e9, color: "#f3a94b", peers: "market +2.8%", peerDelta: 71, note: "Outperforming a positive market" },
    { id: "1027", name: "Ethereum", symbol: "ETH", price: 3544.92, change24h: 1.42, marketCap: 426.3e9, volume24h: 14.9e9, color: "#859af2", peers: "L1 peers +2.1%", peerDelta: 46, note: "Trailing its peer group" },
    { id: "5426", name: "Solana", symbol: "SOL", price: 178.64, change24h: 6.82, marketCap: 79.2e9, volume24h: 3.7e9, color: "#8fe7bb", peers: "L1 peers +2.1%", peerDelta: 94, note: "Move is broader than L1 peers" },
    { id: "3408", name: "USD Coin", symbol: "USDC", price: 1.0001, change24h: 0.02, marketCap: 33.8e9, volume24h: 4.8e9, color: "#6a9bf0", peers: "stablecoin range", peerDelta: 12, note: "Within its usual narrow range" },
    { id: "825", name: "Tether", symbol: "USDT", price: 0.9998, change24h: -0.01, marketCap: 118.4e9, volume24h: 47.2e9, color: "#55bf9b", peers: "stablecoin range", peerDelta: 10, note: "Within its usual narrow range" },
    { id: "1975", name: "Chainlink", symbol: "LINK", price: 18.24, change24h: 4.37, marketCap: 10.7e9, volume24h: 0.42e9, color: "#719cf5", peers: "Infra peers +2.7%", peerDelta: 79, note: "Outperforming infrastructure peers" },
    { id: "52", name: "XRP", symbol: "XRP", price: 0.6241, change24h: -2.46, marketCap: 34.1e9, volume24h: 1.23e9, color: "#90a3b7", peers: "large caps +2.5%", peerDelta: 21, note: "Moving against large-cap peers" },
    { id: "74", name: "Dogecoin", symbol: "DOGE", price: 0.163, change24h: 8.25, marketCap: 23.5e9, volume24h: 1.62e9, color: "#d2b156", peers: "meme assets +1.7%", peerDelta: 97, note: "Strong move within a volatile category" }
  ]
};

const state = {
  data: demoData,
  view: "pulse",
  theses: loadTheses(),
  activeFilter: "all",
  comparePeriod: "7D",
  compareSymbols: ["BTC", "ETH", "SOL"],
  comparePickerOpen: false,
  comparePickerQuery: "",
  historicalCache: {},
  historyPending: {},
  currentAsset: null,
  auth: { configured: false, url: null, publishableKey: null, session: null, user: null, pendingEmail: null, syncing: false, syncRequested: false }
};

function loadTheses() {
  try { const rows = JSON.parse(localStorage.getItem("cmc-lens-theses") || "[]"); return Array.isArray(rows) ? rows : []; }
  catch { return []; }
}
function saveTheses(sync = true) {
  localStorage.setItem("cmc-lens-theses", JSON.stringify(state.theses));
  if (sync && state.auth.user) syncWorkspace().catch(() => updateStorageStatus("Saved locally · cloud sync will retry"));
}
function money(n, digits = 2) {
  if (!Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(digits > 1 ? 2 : 1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1) return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
  return `$${v.toFixed(4)}`;
}
function fmtPercent(v, plus = true) { const n = Number(v); return `${plus && n > 0 ? "+" : ""}${n.toFixed(2)}%`; }
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
}

function renderMovements() {
  const rows = [...state.data.assets].filter(a => a.symbol !== "USDC" && a.symbol !== "USDT").sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 4);
  document.getElementById("movement-list").innerHTML = rows.map(a => `<div class="movement-row" data-asset="${escapeHtml(a.symbol)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(a.name)} research"><div class="asset-cell"><span class="coin-icon" style="--coin-bg:${a.color}20;--coin-fg:${a.color}">${escapeHtml(a.symbol.slice(0, 1))}</span><span class="asset-name-wrap"><span class="asset-name">${escapeHtml(a.name)}</span><small class="asset-symbol">${escapeHtml(a.symbol)}</small></span></div><span class="move-value ${a.change24h >= 0 ? "up" : "down"}">${fmtPercent(a.change24h)}</span><span class="peer-context"><span class="peer-bar"><i style="--peer:${a.peerDelta}%"></i></span><span class="peer-text">${escapeHtml(a.peers)}</span></span><span class="row-arrow">↗</span></div>`).join("");
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
  const breadthAvailable = g.breadth !== null && g.breadth !== undefined && Number.isFinite(Number(g.breadth));
  const breadthTotal = Number(g.breadthTotal) > 0 ? Number(g.breadthTotal) : state.data.assets.length;
  const breadthCount = Number.isFinite(Number(g.breadthCount)) ? Number(g.breadthCount) : state.data.assets.filter(a => Number(a.change24h) > 0).length;
  document.getElementById("breadth-value").textContent = breadthAvailable ? String(breadthCount) : "—";
  document.getElementById("breadth-total").textContent = String(breadthTotal);
  document.getElementById("breadth-advancing").textContent = String(breadthCount);
  document.getElementById("breadth-declining").textContent = String(Math.max(0, breadthTotal - breadthCount));
  document.getElementById("breadth-scope").textContent = state.data.mode === "live" ? "TOP 100" : "DEMO SAMPLE";
  const breadthInfo = document.getElementById("breadth-info");
  breadthInfo.dataset.tip = state.data.mode === "live"
    ? "Breadth counts assets with positive 24h change in CoinMarketCap's top 100 by market capitalization."
    : "Breadth counts positive 24h moves across this illustrative demo asset sample. It does not describe the full crypto market.";
  const ring = document.getElementById("breadth-ring");
  const breadth = breadthAvailable ? Math.max(0,Math.min(100,g.breadth)) : 0;
  ring.style.borderRightColor = breadth > 45 ? "var(--lime)" : "var(--surface-3)";
  ring.style.borderBottomColor = breadth > 70 ? "var(--lime)" : "var(--surface-3)";
  const btcAsset = state.data.assets.find(a => a.symbol === "BTC");
  const narrative = document.getElementById("breadth-narrative");
  narrative.innerHTML = !breadthAvailable ? "Market breadth is unavailable in this response." : btcAsset
    ? `Bitcoin is ${Number(btcAsset.change24h) >= 0 ? "up" : "down"} <b>${Math.abs(Number(btcAsset.change24h)).toFixed(2)}%</b>, while <b>${breadthCount} of ${breadthTotal}</b> tracked assets are advancing. Breadth adds context to the move; it does not identify its cause.`
    : `<b>${breadthCount} of ${breadthTotal}</b> tracked assets are advancing. Breadth adds context to the move; it does not identify its cause.`;
  document.getElementById("breadth-method").textContent = breadthAvailable ? `Positive 24h change · ${breadthTotal} ${state.data.mode === "live" ? "CMC assets by market cap" : "illustrative demo assets"}` : "No usable asset coverage in this response";
  document.getElementById("market-timestamp").textContent = state.data.mode === "live" && state.data.retrievedAt
    ? `Retrieved ${new Date(state.data.retrievedAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}` : "Illustrative demo snapshot";
  const sentiment = g.sentiment;
  const hasSentiment = sentiment !== null && sentiment !== undefined && Number.isFinite(Number(sentiment));
  document.getElementById("sentiment-score").textContent = hasSentiment ? String(sentiment) : "—";
  document.getElementById("sentiment-label").textContent = hasSentiment ? (sentiment >= 65 ? "Greed signal" : sentiment <= 35 ? "Fear signal" : "Mixed sentiment") : "No live source enabled";
  document.getElementById("sentiment-marker").style.left = hasSentiment ? `${Math.max(0,Math.min(100,Number(sentiment)))}%` : "0%";
  document.getElementById("sentiment-marker").style.display = hasSentiment ? "block" : "none";
  const dateEl = document.getElementById("local-date");
  dateEl.textContent = new Date().toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"}).toUpperCase();
  renderCategoryChart(); renderMovements(); renderThesisCards();
  const sparkHost=document.getElementById("market-sparkline");
  if(state.data.mode==="demo") sparkline(); else sparkHost.innerHTML=`<div class="category-empty">Live historical series is not connected for this metric.</div>`;
  setConnection(state.data.mode, state.data.retrievedAt);
  renderCompare(); renderExplore();
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".page-view").forEach(el => el.classList.remove("active"));
  const target = document.getElementById(`view-${view}`); if (target) target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  document.getElementById("breadcrumb-current").textContent = ({pulse:"Market pulse",explore:"Explore assets",compare:"Compare",theses:"Thesis log",settings:"Settings"})[view] || "Workspace";
  document.getElementById("sidebar").classList.remove("open");
  if (view === "compare") loadCompareHistory();
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

function thesisForm() {
  const date = new Date(); date.setDate(date.getDate()+7);
  const dateValue = date.toISOString().slice(0,10);
  openModal(`<div class="modal-head"><div><div class="panel-kicker">A RECORD YOU CAN RETURN TO</div><h2 id="modal-title">Start a thesis</h2><p>Write down the view and the evidence you have today.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><form class="thesis-form" id="thesis-form"><div class="field"><label for="thesis-question">WHAT ARE YOU TRYING TO UNDERSTAND?</label><input id="thesis-question" name="title" maxlength="90" placeholder="e.g. Is SOL outperforming other layer 1s?" required /></div><div class="form-grid"><div class="field"><label for="thesis-asset">PRIMARY ASSET</label><select id="thesis-asset" name="asset">${state.data.assets.map(a=>`<option value="${escapeHtml(a.symbol)}">${escapeHtml(a.name)} · ${escapeHtml(a.symbol)}</option>`).join("")}</select></div><div class="field"><label for="thesis-review">REVIEW AFTER</label><select id="thesis-review" name="horizon"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div></div><div class="field"><label for="thesis-view">YOUR CURRENT VIEW <span style="color:var(--quiet)">· OPTIONAL</span></label><textarea id="thesis-view" name="view" maxlength="600" placeholder="What do you think is happening? What might change your mind?"></textarea><span class="field-help">Your view is saved in this browser. CMC Lens does not generate buy or sell instructions.</span></div><div class="field"><label for="thesis-condition">WHAT WOULD CHANGE YOUR VIEW? <span style="color:var(--quiet)">· OPTIONAL</span></label><input id="thesis-condition" name="condition" maxlength="180" placeholder="e.g. Relative strength fades against the L1 group" /></div><div class="form-actions"><button type="button" class="form-cancel" id="form-cancel">Cancel</button><button type="submit" class="primary-button">Save research record <span>→</span></button></div></form>`);
  document.getElementById("form-cancel").addEventListener("click",closeModal);
  document.getElementById("thesis-form").addEventListener("submit", e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget); const symbol=String(fd.get("asset")); const a=assetBySymbol(symbol); const d=new Date();
    const review=new Date();review.setDate(review.getDate()+Number(fd.get("horizon")));
    const source=state.data.mode==="live"?"CoinMarketCap":"Demo dataset";
    const t={id:crypto.randomUUID(),title:String(fd.get("title")).trim(),assetId:a?.id||null,assetSymbol:symbol,assetName:a?.name||symbol,view:String(fd.get("view")||"").trim(),condition:String(fd.get("condition")||"").trim(),createdAt:d.toISOString(),reviewAt:review.toISOString(),status:"open",baselineSnapshotId:crypto.randomUUID(),baselineSnapshot:{sourceProvider:source==="CoinMarketCap"?"coinmarketcap":"demo",sourceEndpoint:source==="CoinMarketCap"?"/v3/cryptocurrency/quotes/latest":null,sourceObservedAt:state.data.source?.observedAt||null,capturedAt:d.toISOString(),currency:"USD",metrics:{price:a?.price??null,change24h:a?.change24h??null,marketCap:a?.marketCap??null,volume24h:a?.volume24h??null,peerContext:a?.peers||null},coverage:source==="CoinMarketCap"?"complete":"partial",limitations:source==="CoinMarketCap"?"Quote snapshot only; it does not establish the cause of a price move.":"Illustrative demo values, not live market evidence."},evidence:[{label:`${symbol} 24h change`,value:fmtPercent(a?.change24h||0),detail:`Observed at ${d.toISOString()} · source timestamp ${state.data.source?.observedAt||"not supplied"}.`,source},{label:`${symbol} price`,value:money(a?.price,a?.price<1?4:2),detail:"Quote currency USD · source value captured when the thesis was recorded.",source},{label:"Market capitalization",value:amountLabel(a?.marketCap),detail:"CMC-reported market capitalization at the baseline capture.",source},{label:"Research context",value:a?.peers||"Market",detail:"Peer context is shown as a prompt for investigation, not as a prediction."}],reviews:[]};
    state.theses.unshift(t);saveTheses();renderThesisCards();closeModal();toast("Thesis saved with a dated evidence snapshot.");
  });
}

function showThesis(id) {
  const t=state.theses.find(x=>x.id===id);if(!t)return;
  const evidence=(t.evidence||[]).map(e=>`<div class="evidence-row"><i></i><div><strong>${escapeHtml(e.label)} <span style="color:var(--lime);font-family:var(--mono);font-weight:400">${escapeHtml(e.value)}</span></strong><small>${escapeHtml(e.detail)} Source: ${escapeHtml(e.source)}.</small></div></div>`).join("");
  const review=(t.reviews||[]).map(r=>`<div class="evidence-row"><i style="background:var(--blue)"></i><div><strong>Review · ${safeDate(r.date)} <span style="color:var(--blue);font-family:var(--mono);font-weight:400">${escapeHtml(r.result||"Observation")}</span></strong><small>${escapeHtml(r.note)}</small>${r.snapshot?.derivedMetrics?.priceChangeSinceBaselinePct!==null&&r.snapshot?.derivedMetrics?.priceChangeSinceBaselinePct!==undefined?`<small>Price change since baseline: ${fmtPercent(r.snapshot.derivedMetrics.priceChangeSinceBaselinePct)} · ${escapeHtml(r.snapshot.sourceProvider||"source unavailable")}</small>`:""}</div></div>`).join("");
  const due=t.status!=="reviewed"&&new Date(t.reviewAt)<=new Date();
  openModal(`<div class="modal-head"><div><div class="panel-kicker">${escapeHtml(t.assetSymbol||"MARKET")} · ${escapeHtml(statusLabel(t).toUpperCase())}</div><h2 id="modal-title">${escapeHtml(t.title)}</h2><p>Logged ${safeDate(t.createdAt)} · Review ${safeDate(t.reviewAt)}</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content"><div class="detail-section"><h3>THE VIEW AT THE TIME</h3><div class="detail-note">${escapeHtml(t.view||"No written explanation added yet.")}${t.condition?`<br/><br/><strong style="color:var(--text-2)">Condition to revisit:</strong> ${escapeHtml(t.condition)}`:""}</div></div><div class="detail-section"><h3>ORIGINAL EVIDENCE · PRESERVED</h3><div class="detail-evidence">${evidence||"<div class='detail-note'>No evidence snapshot attached.</div>"}</div></div>${review?`<div class="detail-section"><h3>REVIEW HISTORY</h3><div class="detail-evidence">${review}</div></div>`:""}<div class="detail-actions"><button class="danger-button" id="delete-thesis">Delete record</button><div>${t.status!=="reviewed"?`<button class="primary-button" id="review-thesis">${due?"Review this thesis":"Add a review"} <span>→</span></button>`:""}</div></div></div>`);
  document.getElementById("delete-thesis").addEventListener("click",async()=>{if(!window.confirm("Delete this research record and its synced evidence?"))return;try{if(state.auth.user)await sbRequest(`/rest/v1/theses?id=eq.${encodeURIComponent(id)}`,{method:"DELETE"});state.theses=state.theses.filter(x=>x.id!==id);saveTheses(false);renderThesisCards();closeModal();toast("Research record deleted.");}catch{toast("The record could not be deleted from your synced workspace.",true);}});
  const rb=document.getElementById("review-thesis"); if(rb)rb.addEventListener("click",()=>reviewThesis(id));
}

async function reviewThesis(id) {
  const t=state.theses.find(x=>x.id===id);if(!t)return;
  const isLive=state.data.mode==="live"&&/^\d{1,12}$/.test(String(t.assetId||""));
  const loading=`<div class="modal-head"><div><div class="panel-kicker">ADD A DATED OBSERVATION</div><h2 id="modal-title">Review your thesis</h2><p>Keeping the original snapshot unchanged while checking the latest source.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-note">${isLive?"Retrieving a fresh CoinMarketCap quote…":"This record is in demo mode; no live quote will be used."}</div>`;
  openModal(loading);
  let response=null;
  if(isLive){try{const r=await fetch(`/api/market?view=asset&id=${encodeURIComponent(t.assetId)}`,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("Fresh market quote unavailable");response=await r.json();}catch{response=null;}}
  const live=!!(isLive&&response?.asset);
  const current=live?response.asset:(state.data.mode==="demo"?(state.data.assets.find(a=>String(a.id)===String(t.assetId)||a.symbol===t.assetSymbol)||null):null);
  const baseline=t.baselineSnapshot||{};
  const baselineMetrics=baseline.metrics||{};
  const parseMetric=value=>{if(value===null||value===undefined||value==="")return null;const n=Number(String(value).replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:null;};
  const baselinePrice=baselineMetrics.price!==null&&baselineMetrics.price!==undefined&&Number.isFinite(Number(baselineMetrics.price))?Number(baselineMetrics.price):parseMetric(t.evidence?.find(x=>x.label===`${t.assetSymbol} price`)?.value);
  const baselineCap=baselineMetrics.marketCap!==null&&baselineMetrics.marketCap!==undefined&&Number.isFinite(Number(baselineMetrics.marketCap))?Number(baselineMetrics.marketCap):parseMetric(t.evidence?.find(x=>x.label==="Market capitalization")?.value);
  const currentPrice=current?.price??null,currentCap=current?.marketCap??null;
  const priceDelta=currentPrice!==null&&currentPrice!==undefined&&baselinePrice!==null&&baselinePrice!==undefined&&Number.isFinite(Number(currentPrice))&&Number.isFinite(Number(baselinePrice))&&Number(baselinePrice)!==0?((Number(currentPrice)-Number(baselinePrice))/Number(baselinePrice))*100:null;
  const capturedAt=new Date().toISOString();
  const observedAt=live?(response.source?.observedAt||current.observedAt||response.retrievedAt):null;
  const currentLabel=live?"LATEST CMC QUOTE":state.data.mode==="demo"?"DEMO PREVIEW":"LATEST QUOTE UNAVAILABLE";
  const snapshot={sourceProvider:live?"coinmarketcap":state.data.mode==="demo"?"demo":"unavailable",sourceEndpoint:live?"/v3/cryptocurrency/quotes/latest":null,sourceObservedAt:observedAt,capturedAt,currency:"USD",coverage:live?"partial":"unavailable",limitations:live?"Current quote compared with the preserved baseline; this is not a thesis score.":"No live source was available for this review.",metrics:{price:currentPrice,marketCap:currentCap,change24h:current?.change24h??null,volume24h:current?.volume24h??null},derivedMetrics:{priceChangeSinceBaselinePct:priceDelta},baselineSnapshotId:t.baselineSnapshotId||null};
  const baselineLabel=baseline.capturedAt||t.createdAt;
  const formatPrice=value=>value===null||value===undefined?"—":money(Number(value),Number(value)<1?4:2);
  const formatCap=value=>value===null||value===undefined?"—":amountLabel(Number(value));
  const snapshotView=`<div class="detail-section"><h3>BASELINE VS REVIEW SNAPSHOT</h3><div class="review-snapshot-grid"><div class="review-snapshot-cell"><small>ORIGINAL BASELINE</small><strong>${formatPrice(baselinePrice)}</strong><span>Price · USD</span><small>Captured ${safeDate(baselineLabel)}</small><strong>${formatCap(baselineCap)}</strong><span>Market cap</span></div><div class="review-snapshot-cell"><small>${currentLabel}</small><strong>${formatPrice(currentPrice)}</strong><span>Price · USD</span><small>${live&&observedAt?`Source updated ${safeDate(observedAt)}`:live?`Retrieved ${safeDate(capturedAt)}`:"Illustrative values only"}</small><strong>${formatCap(currentCap)}</strong><span>Market cap</span></div></div><div class="detail-note">${priceDelta===null?"A price change could not be calculated from the saved baseline.":`Price change since baseline: ${fmtPercent(priceDelta)}.`} ${live?"A quote change is evidence for your review, not a prediction.":"No live CMC evidence is attached to this review."}</div></div>`;
  openModal(`<div class="modal-head"><div><div class="panel-kicker">${escapeHtml(t.assetSymbol||"MARKET")} · ADD A DATED OBSERVATION</div><h2 id="modal-title">Review your thesis</h2><p>The baseline stays frozen. Record what the latest evidence means to you.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content">${snapshotView}<form class="thesis-form" id="review-form"><div class="field"><label for="review-result">HOW DOES THE VIEW LOOK TODAY?</label><select id="review-result"><option value="Still supported">Still supported</option><option value="Mixed evidence">Mixed evidence</option><option value="Weakened">Weakened</option><option value="No longer relevant">No longer relevant</option></select></div><div class="field"><label for="review-note">WHAT CHANGED?</label><textarea id="review-note" required maxlength="500" placeholder="Compare today's evidence with the original baseline..."></textarea><span class="field-help">${live?`Source: CoinMarketCap · ${escapeHtml(observedAt?new Date(observedAt).toLocaleString():new Date(capturedAt).toLocaleString())}. `:state.data.mode==="demo"?"Demo values only; no current CMC quote was captured. ":"The current CMC quote could not be retrieved. "}CMC Lens records your interpretation without scoring it as a prediction.</span></div><div class="form-actions"><button type="button" class="form-cancel" id="review-cancel">Cancel</button><button type="submit" class="primary-button">Append review <span>→</span></button></div></form></div>`);
  document.getElementById("review-cancel").addEventListener("click",()=>showThesis(id));
  document.getElementById("review-form").addEventListener("submit",e=>{e.preventDefault();const result=document.getElementById("review-result").value;const note=document.getElementById("review-note").value.trim();t.reviews.push({id:crypto.randomUUID(),snapshotId:crypto.randomUUID(),date:capturedAt,result,note,snapshot});t.status="reviewed";t.lastReviewedAt=capturedAt;saveTheses();renderThesisCards();closeModal();toast("Review appended with its source snapshot.");});
}
function showAsset(symbol) {
  const a=assetBySymbol(symbol);if(!a)return;
  state.currentAsset=a;
  const movementNote=a.note || `${a.symbol} has a ${a.change24h>=0?"positive":"negative"} reported 24-hour change.`;
  openModal(`<div class="modal-head"><div><div class="panel-kicker">ASSET DOSSIER · ${escapeHtml(a.symbol)}</div><h2 id="modal-title">${escapeHtml(a.name)}</h2><p>Source context and peer movement, kept together.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content"><div class="detail-metric-row"><div class="detail-metric"><small>PRICE · USD</small><strong>${money(a.price, a.price<1?4:2)}</strong></div><div class="detail-metric"><small>24H CHANGE</small><strong style="color:${a.change24h>=0?"var(--lime)":"var(--red)"}">${fmtPercent(a.change24h)}</strong></div><div class="detail-metric"><small>MARKET CAP</small><strong>${amountLabel(a.marketCap)}</strong></div></div><div class="detail-section"><h3>WHAT TO LOOK AT</h3><div class="detail-evidence"><div class="evidence-row"><i></i><div><strong>${escapeHtml(movementNote)}</strong><small>${escapeHtml(a.symbol)} is ${a.change24h>=0?"up":"down"} ${Math.abs(a.change24h).toFixed(2)}% over 24 hours. Peer context: ${escapeHtml(a.peers)}.</small></div></div><div class="evidence-row"><i style="background:var(--blue)"></i><div><strong>Volume context</strong><small>24h reported volume ${amountLabel(a.volume24h)}. Volume alone does not establish direction or cause.</small></div></div></div></div><div class="detail-section"><h3>RESEARCH LIMIT</h3><div class="detail-note">${state.data.mode==="live"?"Live CMC market data. Check the source timestamp before comparing." : "Demo values for interface preview only. These figures are illustrative and must not be relied on as current market data."}</div></div><div class="detail-actions"><span class="footer-attribution">Data provided by <a href="https://coinmarketcap.com/" target="_blank" rel="noreferrer">CoinMarketCap.com</a></span><div><button class="primary-button" id="asset-thesis">Start a thesis <span>→</span></button></div></div></div>`);
  document.getElementById("asset-thesis").addEventListener("click",()=>{closeModal();setTimeout(()=>{thesisForm();document.getElementById("thesis-asset").value=a.symbol;},100);});
}

function renderExplore(filter="") {
  const host=document.getElementById("asset-results");if(!host)return;
  const q=filter.trim().toLowerCase();const rows=state.data.assets.filter(a=>!q||a.name.toLowerCase().includes(q)||a.symbol.toLowerCase().includes(q)||a.id===q).slice(0,8);
  if(!q){host.innerHTML="";return;}
  host.innerHTML=rows.map(a=>`<div class="asset-result" data-asset="${escapeHtml(a.symbol)}"><span class="coin-icon" style="--coin-bg:${a.color}20;--coin-fg:${a.color}">${escapeHtml(a.symbol.slice(0,1))}</span><span class="asset-cell"><span><span class="asset-name">${escapeHtml(a.name)}</span><small class="asset-symbol">${escapeHtml(a.symbol)}</small></span></span><span>${money(a.price,a.price<1?4:2)}</span><span class="move-value ${a.change24h>=0?"up":"down"}">${fmtPercent(a.change24h)}</span></div>`).join("")||`<div class="empty-theses">No matching asset in this ${state.data.mode==="live"?"search result":"demo sample"}.</div>`;
  host.querySelectorAll("[data-asset]").forEach(el=>el.addEventListener("click",()=>showAsset(el.dataset.asset)));
}

function renderComparePickerResults() {
  const host=document.getElementById("compare-search-results");if(!host)return;
  const q=state.comparePickerQuery.trim().toLowerCase();
  const rows=state.data.assets.filter(a=>!state.compareSymbols.includes(a.symbol)&&(!q||a.name.toLowerCase().includes(q)||a.symbol.toLowerCase().includes(q)||String(a.id)===q)).slice(0,6);
  if(!rows.length){host.innerHTML=`<div class="compare-picker-empty">${state.data.mode==="live"&&q.length>=2?"Searching CoinMarketCap…":"No matching assets in the loaded list."}</div>`;return;}
  host.innerHTML=rows.map(a=>`<button class="compare-picker-option" data-compare-symbol="${escapeHtml(a.symbol)}"><span>${escapeHtml(a.name)}</span><small>${escapeHtml(a.symbol)} · ${money(a.price,a.price<1?4:2)}</small><b>＋</b></button>`).join("");
  host.querySelectorAll("[data-compare-symbol]").forEach(el=>el.addEventListener("click",()=>{if(state.compareSymbols.length>=4){toast("Compare up to four assets at a time.");return;}state.compareSymbols.push(el.dataset.compareSymbol);state.comparePickerOpen=false;state.comparePickerQuery="";renderCompare();loadCompareHistory();}));
}

function renderCompare() {
  const assets=state.compareSymbols.map(assetBySymbol).filter(Boolean);
  const colors=["var(--lime)","var(--blue)","var(--orange)","var(--red)"];
  const addDisabled=assets.length>=4?" disabled aria-disabled=\"true\"":"";
  const picker=state.comparePickerOpen?`<div class="compare-picker"><input id="compare-asset-search" aria-label="Search assets to compare" placeholder="Search name or symbol" value="${escapeHtml(state.comparePickerQuery)}" autocomplete="off"/><div id="compare-search-results" class="compare-picker-results"></div></div>`:"";
  document.getElementById("compare-assets").innerHTML=assets.map((a,i)=>`<span class="compare-chip" style="--chip:${colors[i]}"><i></i>${escapeHtml(a.symbol)}<button data-remove-symbol="${a.symbol}" aria-label="Remove ${a.symbol}">×</button></span>`).join("")+`<button class="compare-chip" id="compare-add"${addDisabled}>＋ Add asset</button>`+picker;
  document.getElementById("compare-legend").innerHTML=assets.map((a,i)=>`<span><i style="--chip:${colors[i]}"></i>${escapeHtml(a.symbol)}</span>`).join("");
  drawCompareChart(assets, colors);
  document.getElementById("compare-table").innerHTML=`<div class="compare-table-head"><span>ASSET</span><span>24H CHANGE</span><span>MARKET CAP</span><span>PEER CONTEXT</span></div>${assets.map((a,i)=>`<div class="compare-table-row"><span class="asset-cell"><i style="width:7px;height:7px;border-radius:50%;background:${colors[i]}"></i>${escapeHtml(a.name)} (${escapeHtml(a.symbol)})</span><span style="color:${a.change24h>=0?"var(--lime)":"var(--red)"}">${fmtPercent(a.change24h)}</span><span>${amountLabel(a.marketCap)}</span><span>${escapeHtml(a.peers)}</span></div>`).join("")}`;
  document.querySelectorAll("[data-remove-symbol]").forEach(el=>el.addEventListener("click",()=>{state.compareSymbols=state.compareSymbols.filter(x=>x!==el.dataset.removeSymbol);renderCompare();loadCompareHistory();}));
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
  if(state.data.mode!=="live")return;
  const key=`${state.comparePeriod}:${state.compareSymbols.join(",")}`;
  if(state.historicalCache[key]){renderCompare();return;}
  if(state.historyPending[key])return;
  state.historyPending[key]=true;
  renderCompare();
  const rows=await Promise.all(state.compareSymbols.map(async symbol=>{
    const asset=assetBySymbol(symbol);if(!asset)return {symbol,series:[]};
    try{const r=await fetch(`/api/market?view=history&id=${encodeURIComponent(asset.id)}&period=${state.comparePeriod}`,{headers:{Accept:"application/json"}});if(!r.ok)return {symbol,series:[]};const body=await r.json();return {symbol,series:Array.isArray(body.series)?body.series:[],retrievedAt:body.retrievedAt};}
    catch{return {symbol,series:[]};}
  }));
  state.historicalCache[key]=rows;delete state.historyPending[key];
  if(state.view==="compare"&&`${state.comparePeriod}:${state.compareSymbols.join(",")}`===key)renderCompare();
}

async function refreshData() {
  const b=document.getElementById("refresh-data");b.disabled=true;b.innerHTML='<span class="refresh-symbol">↻</span> Updating…';
  try { const r=await fetch("/api/market?view=overview",{headers:{Accept:"application/json"}}); if(!r.ok)throw new Error("Market data request failed"); const d=await r.json(); if(!d||!d.global||!Array.isArray(d.assets))throw new Error("Unexpected market response"); state.data=d;render();toast(d.mode==="live"?"Market context refreshed from CoinMarketCap.":"Demo data refreshed. Live API is not configured."); }
  catch(e){toast("Market data could not be refreshed. Showing the labelled demo dataset.",true);state.data=demoData;render();}
  finally{b.disabled=false;b.innerHTML='<span class="refresh-symbol">↻</span> Refresh data';}
}

async function sbRequest(path, {method="GET",body,token,prefer}={}) {
  const auth=state.auth;
  if(!auth.configured)throw new Error("Account sync is not configured yet.");
  const headers={apikey:auth.publishableKey,Authorization:`Bearer ${token||auth.session?.access_token||auth.publishableKey}`,Accept:"application/json"};
  if(body!==undefined)headers["Content-Type"]="application/json";
  if(prefer)headers.Prefer=prefer;
  const response=await fetch(`${auth.url.replace(/\/$/,"")}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
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

function setAuthSession(session) {
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
      try{const user=await sbRequest("/auth/v1/user");state.auth.user=user;}
      catch{await refreshAuthSession();}
    }
    updateStorageStatus();
    if(state.auth.user)await syncWorkspace();
  }catch{updateStorageStatus();}
}

async function refreshAuthSession(){
  const refresh=state.auth.session?.refresh_token;if(!refresh)return;
  try{const session=await authRequest("token?grant_type=refresh_token",{refresh_token:refresh});setAuthSession(session);}
  catch{state.auth.session=null;state.auth.user=null;localStorage.removeItem("cmc-lens-session");}
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
        setAuthSession(session);state.auth.pendingEmail=null;closeModal();await syncWorkspace();updateStorageStatus();toast("Workspace connected. Your research is syncing.");
      }
    }catch(error){toast(error.message||"Sign-in could not be completed.",true);submit.disabled=false;}
  });
}

async function syncWorkspace(){
  if(!state.auth.user||!state.auth.session)return;
  if(state.auth.syncing){state.auth.syncRequested=true;return;}
  state.auth.syncing=true;
  const owner=state.auth.user.id;
  const insertOnly="resolution=ignore-duplicates,return=minimal";
  try{
    for(const t of state.theses){
      t.baselineSnapshotId ||= crypto.randomUUID();
      const thesis={id:t.id,owner_id:owner,title:t.title,question:"",thesis_text:t.view||"",status:t.status==="reviewed"?"reviewed":"open",horizon_start:t.createdAt,review_at:t.reviewAt||null,primary_asset_id:t.assetId||null,primary_asset_symbol:t.assetSymbol||null,privacy:"private",created_at:t.createdAt,updated_at:t.createdAt};
      await sbRequest("/rest/v1/theses?on_conflict=id",{method:"POST",body:thesis,prefer:"resolution=merge-duplicates,return=minimal"});
      const source=t.evidence?.[0]?.source||"Demo dataset";
      const snapshot={id:t.baselineSnapshotId,owner_id:owner,thesis_id:t.id,snapshot_kind:"baseline",source_provider:source==="CoinMarketCap"?"coinmarketcap":"demo",source_endpoint:source==="CoinMarketCap"?"/v3/cryptocurrency/quotes/latest":null,source_observed_at:t.baselineSnapshot?.sourceObservedAt||t.createdAt,captured_at:t.baselineSnapshot?.capturedAt||t.createdAt,source_payload:{evidence:t.evidence||[],baseline:t.baselineSnapshot||null},derived_metrics:{assetSymbol:t.assetSymbol||null,peerContext:t.evidence?.find(x=>x.label==="Research context")?.value||null},coverage:source==="CoinMarketCap"?"complete":"partial",limitations:source==="CoinMarketCap"?"User-authored interpretation; source data is a compacted application snapshot.":"Illustrative demo values, not live market evidence."};
      await sbRequest("/rest/v1/thesis_snapshots?on_conflict=id",{method:"POST",body:snapshot,prefer:insertOnly});
      await sbRequest(`/rest/v1/theses?id=eq.${encodeURIComponent(t.id)}`,{method:"PATCH",body:{baseline_snapshot_id:t.baselineSnapshotId},prefer:"return=minimal"});
      const evidence=(t.evidence||[]).map(item=>{item.id ||= crypto.randomUUID();return {id:item.id,owner_id:owner,thesis_id:t.id,snapshot_id:t.baselineSnapshotId,kind:item.kind||"metric",label:item.label,detail:item.detail||"",source_url:item.sourceUrl||null,source_timestamp:item.sourceTimestamp||t.createdAt,value_text:item.value||null,unit:item.unit||null,direction:item.direction||"neutral"};});
      if(evidence.length)await sbRequest("/rest/v1/evidence_items?on_conflict=id",{method:"POST",body:evidence,prefer:insertOnly});
      if(t.condition){t.conditionId ||= crypto.randomUUID();await sbRequest("/rest/v1/thesis_conditions?on_conflict=id",{method:"POST",body:{id:t.conditionId,owner_id:owner,thesis_id:t.id,condition_type:"qualitative",metric_key:"user_defined",effect:"weaken",description:t.condition,active:true},prefer:"resolution=merge-duplicates,return=minimal"});}
      for(const review of t.reviews||[]){review.id ||= crypto.randomUUID();review.snapshotId ||= crypto.randomUUID();await sbRequest("/rest/v1/thesis_snapshots?on_conflict=id",{method:"POST",body:{id:review.snapshotId,owner_id:owner,thesis_id:t.id,snapshot_kind:"manual_review",source_provider:source==="CoinMarketCap"?"coinmarketcap":"demo",source_observed_at:review.snapshot?.sourceObservedAt||review.date,captured_at:review.snapshot?.capturedAt||review.date,source_payload:{assetSymbol:t.assetSymbol||null,review:review.snapshot||null},derived_metrics:review.snapshot?.derivedMetrics||{},coverage:review.snapshot?.coverage||"unavailable",limitations:review.snapshot?.limitations||"No fresh source snapshot was captured at review time."},prefer:insertOnly});await sbRequest("/rest/v1/thesis_reviews?on_conflict=id",{method:"POST",body:{id:review.id,owner_id:owner,thesis_id:t.id,snapshot_id:review.snapshotId,reviewed_at:review.date,result_label:review.result,summary:review.note||""},prefer:insertOnly});}
    }
    {const remote=await sbRequest(`/rest/v1/theses?select=*&owner_id=eq.${encodeURIComponent(owner)}&order=created_at.desc`);const missing=(remote||[]).filter(row=>!state.theses.some(t=>t.id===row.id));
      if(missing.length){const missingIds=missing.map(t=>t.id).join(",");const [evidence,reviews,snapshots,conditions]=await Promise.all([sbRequest(`/rest/v1/evidence_items?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${missingIds})`),sbRequest(`/rest/v1/thesis_reviews?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${missingIds})`),sbRequest(`/rest/v1/thesis_snapshots?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${missingIds})&order=captured_at.asc`),sbRequest(`/rest/v1/thesis_conditions?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${missingIds})&active=eq.true`)]);for(const row of missing){const thesisSnapshots=(snapshots||[]).filter(x=>x.thesis_id===row.id);const baseline=thesisSnapshots.find(x=>x.id===row.baseline_snapshot_id)||null;const rowConditions=(conditions||[]).filter(x=>x.thesis_id===row.id);state.theses.push({id:row.id,title:row.title,view:row.thesis_text,assetId:row.primary_asset_id,assetSymbol:row.primary_asset_symbol,createdAt:row.created_at,reviewAt:row.review_at,status:row.status,baselineSnapshotId:row.baseline_snapshot_id,baselineSnapshot:baseline?.source_payload?.baseline||null,condition:rowConditions[0]?.description||"",conditionId:rowConditions[0]?.id||null,evidence:(evidence||[]).filter(x=>x.thesis_id===row.id&&(!row.baseline_snapshot_id||x.snapshot_id===row.baseline_snapshot_id)).map(x=>({id:x.id,label:x.label,value:x.value_text||"",detail:x.detail,source:baseline?.source_provider==="coinmarketcap"?"CoinMarketCap":"Synced evidence",sourceTimestamp:x.source_timestamp,sourceUrl:x.source_url})),reviews:(reviews||[]).filter(x=>x.thesis_id===row.id).map(x=>({id:x.id,date:x.reviewed_at,result:x.result_label,note:x.summary,snapshotId:x.snapshot_id,snapshot:thesisSnapshots.find(s=>s.id===x.snapshot_id)?.source_payload?.review||null}))});}}
    }
    localStorage.setItem("cmc-lens-theses",JSON.stringify(state.theses));renderThesisCards();updateStorageStatus("Synced to your private Supabase workspace.");
  }finally{state.auth.syncing=false;if(state.auth.syncRequested){state.auth.syncRequested=false;syncWorkspace().catch(()=>updateStorageStatus("Saved locally · cloud sync will retry"));}}
}

async function signOutWorkspace(){
  try{await sbRequest("/auth/v1/logout",{method:"POST"});}catch{}
  state.auth.session=null;state.auth.user=null;localStorage.removeItem("cmc-lens-session");updateStorageStatus("Signed out · records remain in this browser and your cloud workspace.");
}

function setup() {
  const savedTheme=localStorage.getItem("cmc-lens-theme");if(savedTheme==="light"||savedTheme==="dark")document.documentElement.dataset.theme=savedTheme;
  document.querySelectorAll("[data-view]").forEach(el=>el.addEventListener("click",()=>switchView(el.dataset.view)));
  document.getElementById("theme-toggle").addEventListener("click",()=>setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark"));
  document.querySelectorAll("[data-set-theme]").forEach(el=>el.addEventListener("click",()=>setTheme(el.dataset.setTheme)));
  document.querySelectorAll("[data-thesis-filter]").forEach(el=>el.addEventListener("click",()=>{state.activeFilter=el.dataset.thesisFilter;document.querySelectorAll("[data-thesis-filter]").forEach(x=>x.classList.toggle("selected",x===el));renderThesesPage();}));
  ["new-thesis","new-thesis-alt","explore-new-thesis","theses-new","compare-save-thesis"].forEach(id=>document.getElementById(id).addEventListener("click",thesisForm));
  document.getElementById("refresh-data").addEventListener("click",refreshData);
  document.getElementById("auth-action").addEventListener("click",()=>state.auth.user?signOutWorkspace():authForm());
  document.getElementById("demo-banner-close").addEventListener("click",()=>document.getElementById("demo-banner").hidden=true);
  document.getElementById("mobile-menu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
  const search=document.getElementById("asset-search");let searchTimer;search.addEventListener("input",()=>{renderExplore(search.value);clearTimeout(searchTimer);if(state.data.mode==="live"&&search.value.trim().length>=2)searchTimer=setTimeout(()=>searchRemote(search.value.trim()),450);});
  search.addEventListener("keydown",e=>{if(e.key==="Enter"){const a=state.data.assets.find(x=>x.name.toLowerCase().includes(search.value.toLowerCase())||x.symbol.toLowerCase()===search.value.toLowerCase());if(a)showAsset(a.symbol);}});
  document.getElementById("search-trigger").addEventListener("click",()=>{switchView("explore");setTimeout(()=>search.focus(),50)});
  document.getElementById("method-open").addEventListener("click",()=>openModal(`<div class="modal-head"><div><div class="panel-kicker">METHOD NOTE</div><h2 id="modal-title">Market breadth</h2><p>How the Market Pulse observation is assembled.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content"><div class="detail-note">Breadth is the count of tracked assets with a positive reported 24-hour price change, divided by the tracked asset set. The demo uses a small illustrative set. In live mode, the exact CMC response window and number of assets will be shown here. Breadth says how widely prices moved in one direction; it does not identify the cause or forecast the next move.</div></div>`));
  document.getElementById("connection-info").addEventListener("click",()=>openModal(`<div class="modal-head"><div><div class="panel-kicker">DATA CONNECTION</div><h2 id="modal-title">Source and freshness</h2><p>Know what you are looking at before you draw a conclusion.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="detail-content"><div class="detail-note">Demo mode uses illustrative sample values and does not call CoinMarketCap. When a server-side API key is configured, the app will label the response live and show the retrieval time. CMC API credentials are never entered into the browser.</div></div>`));
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
  try{const r=await fetch(`/api/market?view=search&q=${encodeURIComponent(q)}`,{headers:{Accept:"application/json"}});if(!r.ok)return;const body=await r.json();if(body.mode!=="live"||!Array.isArray(body.assets))return;const existing=new Set(state.data.assets.map(a=>a.symbol));state.data.assets=[...state.data.assets,...body.assets.filter(a=>!existing.has(a.symbol))];if(target==="compare")renderComparePickerResults();else renderExplore(document.getElementById("asset-search").value);}
  catch{ /* Keep the already-rendered search results usable if the API is unavailable. */ }
}

function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem("cmc-lens-theme",theme);document.getElementById("theme-toggle").setAttribute("aria-label",`Switch to ${theme==="dark"?"light":"dark"} theme`);document.querySelectorAll("[data-set-theme]").forEach(el=>el.classList.toggle("selected",el.dataset.setTheme===theme));}
document.addEventListener("DOMContentLoaded",setup);
document.addEventListener("keydown",e=>{
  if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();switchView("explore");setTimeout(()=>document.getElementById("asset-search").focus(),20);}
  if((e.metaKey||e.ctrlKey)&&["1","2","3"].includes(e.key)){e.preventDefault();switchView(({"1":"pulse","2":"explore","3":"compare"})[e.key]);}
});
