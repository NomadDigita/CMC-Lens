Warning: truncated output (original token count: 46642)
Total output lines: 1593

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
  rwa: { assets: [], selectedId: null, detail: null, filter: "all", query: "", mode: "demo", loading: false, loadedAt: 0 },
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
  if (v === 0) return "$0.00";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(digits > 1 ? 2 : 1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1) {
    const maxFractionDigits = Math.max(2, Math.min(8, Number.isFinite(Number(digits)) ? Math.trunc(Number(digits)) : 2));
    return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: maxFractionDigits });
  }
  return `$${v.toFixed(4)}`;
}
function fmtPercent(v, plus = true) { const n = Number(v); return `${plus && n > 0 ? "+" : ""}${n.toFixed(2)}%`; }
function hasNumericValue(v) { return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)); }
function fmtOptionalPercent(v, plus = true) { return hasNumericValue(v) ? fmtPercent(Number(v), plus) : "—"; }
function escapeHtml(s = "") { return String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
function safeDate(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "Not set" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function assetBySymbol(symbol) { return state.data.assets.find(a => a.symbol === symbol) || demoData.assets.find(a => a.symbol === symbol); }
function amountLabel(n) { return money(n, 1); }
function authRedirectTo() {
  const host=location.hostname.toLowerCase();
  const isLocal=host==="localhost"||host==="127.0.0.1"||host==="[::1]";
  return isLocal?"https://cmc-lens.vercel.app/":`${location.origin}/`;
}
function safeCmcLogo(value) {
  if(typeof value!=="string")return "";
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&url.hostname==="s2.coinmarketcap.com"?url.href:"";
  }catch{return "";}
}

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
  document.getElementById("movement-list").innerHTML = rows.map(a => {
    const logoId = String(a.id || "").replace(/[^0-9]/g, "");
    const fallback = escapeHtml((a.symbol || "?").slice(0, 1));
    const logo = logoId ? `<img src="https://s2.coinmarketcap.com/static/img/coins/64x64/${logoId}.png" alt="" loading="lazy" decoding="async" />` : fallback;
    return `<div class="movement-row" data-asset="${escapeHtml(a.symbol)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(a.name)} research"><div class="asset-cell"><span class="coin-icon" data-fallback="${fallback}" style="--coin-bg:${a.color}20;--coin-fg:${a.color}">${logo}</span><span class="asset-name-wrap"><span class="asset-name">${escapeHtml(a.name)}</span><small class="asset-symbol">${escapeHtml(a.symbol)}</small></span></div><span class="move-value ${hasNumericValue(a.change24h) ? (Number(a.change24h) >= 0 ? "up" : "down") : ""}">${fmtOptionalPercent(a.change24h)}</span><span class="peer-context"><span class="peer-bar"><i style="--peer:${a.peerDelta}%"></i></span><span class="peer-text">${escapeHtml(a.peers)}</span></span><span class="row-arrow">↗</span></div>`;
  }).join("");
  document.querySelectorAll(".coin-icon img").forEach(img => img.addEventListener("error", () => {
    const icon = img.parentElement;
    icon.textContent = icon.dataset.fallback || "?";
    icon.classList.add("coin-icon-fallback");
  }, { once: true }));
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
  renderReviewReminderBadge();
}

function renderReviewReminderBadge() {
  const button=document.getElementById("notification-button");
  const badge=button?.querySelector(".notification-indicator");
  if(!button||!badge)return;
  const now=Date.now();
  const due=state.theses.filter(t=>t.status!=="reviewed"&&Number.isFinite(Date.parse(t.reviewAt))&&Date.parse(t.reviewAt)<=now).length;
  badge.textContent=due?(due>9?"9+":String(due)):"";
  button.dataset.dueCount=String(due);
  button.setAttribute("aria-label",due?`Research reminders, ${due} ${due===1?"review":"reviews"} due`:"Research reminders");
}
function reviewInboxGroup(title,items,type,now) {
  const rows=items.map(t=>{
    const dueAt=Date.parse(t.reviewAt||"");
    const reviewedAt=t.lastReviewedAt||(t.reviews||[]).at(-1)?.date||t.updatedAt||t.createdAt;
    let timing="";
    if(type==="due"){const days=Math.floor(Math.max(0,now-dueAt)/86400000);timing=days? `${days}d overdue`:"Due today";}
    else if(type==="upcoming"){const days=Math.max(1,Math.ceil((dueAt-now)/86400000));timing=`In ${days}d`;}
    else timing=`Reviewed ${safeDate(reviewedAt)}`;
    const provider=t.baselineSnapshot?.sourceProvider==="coinmarketcap"?"CMC evidence":"Demo baseline";
    return `<button class="review-inbox-item" type="button" data-review-thesis="${escapeHtml(t.id)}"><span class="review-inbox-copy"><span class="panel-kicker">${escapeHtml(t.assetSymbol||"MARKET")} · ${escapeHtml(provider)}</span><strong>${escapeHtml(t.title||"Untitled thesis")}</strong><small>${type==="reviewed"?`Last updated ${escapeHtml(safeDate(reviewedAt))}`:`Review date ${escapeHtml(safeDate(t.reviewAt))}`}</small></span><span class="review-inbox-time ${type==="due"?"is-due":""}">${escapeHtml(timing)} <b>→</b></span></button>`;
  }).join("");
  return `<section class="review-inbox-group"><div class="review-inbox-group-head"><h3>${escapeHtml(title)}</h3><span>${items.length}</span></div>${rows||`<div class="review-inbox-empty">${type==="due"?"No reviews are due.":type==="upcoming"?"No upcoming review dates.":"Reviewed records will appear here."}</div>`}</section>`;
}
function openReviewInbox() {
  const now=Date.now();
  const open=state.theses.filter(t=>t.status!=="reviewed"&&Number.isFinite(Date.parse(t.reviewAt)));
  const due=open.filter(t=>Date.parse(t.reviewAt)<=now).sort((a,b)=>Date.parse(a.reviewAt)-Date.parse(b.reviewAt));
  const upcoming=open.filter(t=>Date.parse(t.reviewAt)>now).sort((a,b)=>Date.parse(a.reviewAt)-Date.parse(b.reviewAt));
  const reviewed=state.theses.filter(t=>t.status==="reviewed").sort((a,b)=>Date.parse(b.lastReviewedAt||b.updatedAt||b.createdAt)-Date.parse(a.lastReviewedAt||a.updatedAt||a.createdAt)).slice(0,3);
  const body=state.theses.length?`<div class="review-inbox-summary"><div><small>NEEDS REVIEW</small><strong>${due.length}</strong></div><div><small>UPCOMING</small><strong>${upcoming.length}</strong></div><div><small>REVIEWED</small><strong>${state.theses.filter(t=>t.status==="reviewed").length}</strong></div></div><div class="review-inbox-list">${reviewInboxGroup("Needs your review",due,"due",now)}${reviewInboxGroup("Coming up",upcoming,"upcoming",now)}${reviewInboxGroup("Recently reviewed",reviewed,"reviewed",now)}</div>`:`<div class="review-inbox-first"><span class="method-mark">ƒ</span><h3>Your research review queue starts with a thesis.</h3><p>Save a dated view and its evidence. CMC Lens will keep its review date here so you can return without relying on memory.</p><button class="primary-button" id="review-inbox-new">Start a thesis <span>→</span></button></div>`;
  openModal(`<div class="modal-head"><div><div class="panel-kicker">RESEARCH WORKFLOW</div><h2 id="modal-title">Review inbox.</h2><p>Review dates are checkpoints, not price alerts. Open any record to inspect its original evidence.</p></div><button id="modal-close" class="modal-close" aria-label="Close">×</button></div><div class="review-inbox">${body}<p class="review-inbox-note">Records stay in this browser until you connect a workspace. Live CMC observations and demo baselines are labeled separately.</p></div>`);
  document.querySelectorAll("[data-review-thesis]").forEach(button=>button.addEventListener("click",()=>{const id=button.dataset.reviewThesis;closeModal();showThesis(id);}));
  document.getElementById("review-inbox-new")?.addEventListener("click",()=>{closeModal();thesisForm();});
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
  const btcDominance = hasNumericValue(g.btcDominance) ? Number(g.btcDominance) : null;
  document.getElementById("btc-dominance").innerHTML = btcDominance !== null ? `${btcDominance.toFixed(1)}<span>%</span>` : "—";
  const dominanceBar = document.querySelector(".dominance-bar");
  if (dominanceBar) {
    const fill = dominanceBar.querySelector("span"), marker = dominanceBar.querySelector("i");
    if (btcDominance !== null) {
      const percent = Math.max(0, Math.min(100, btcDominance));
      fill.style.width = percent + "%";
      marker.style.left = percent + "%";
      dominanceBar.setAttribute("aria-label", "Bitcoin dominance " + percent.toFixed(1) + "%");
    } else {
      fill.style.width = "0%";
      marker.style.display = "none";
      dominanceBar.setAttribute("aria-label", "Bitcoin dominance unavailable");
    }
  }
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
  const btcAsset = state.data.assets.find(a => a.symbo…34642 tokens truncated…,updatedAt:row.updated_at,status:row.status,baselineSnapshotId:row.baseline_snapshot_id,baselineSnapshot:null,condition:"",conditionId:null,evidence:[],reviews:[]});
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
    const condition=(conditionRows||[]).filter(row=>row.thesis_id===thesis.id).reduce((latest,row)=>!latest||Date.parse(row.updated_at||row.created_at||"")>Date.parse(latest.updated_at||latest.created_at||"")?row:latest,null);if(condition)reconcileConditionForSync(thesis,condition);
    thesis.watchEvents ||= [];
    for(const row of eventRows||[]){if(row.thesis_id!==thesis.id)continue;const remoteEvent={id:row.id,checkId:row.check_id,conditionId:row.condition_id,outcome:row.outcome,ruleSnapshot:row.rule_snapshot||{},observedValue:row.observed_value===null?null:Number(row.observed_value),threshold:row.threshold===null?null:Number(row.threshold),unit:row.unit||"",sourceProvider:row.source_provider,sourceEndpoint:row.source_endpoint||null,sourceObservedAt:row.source_observed_at||null,evaluatedAt:row.evaluated_at,coverage:row.coverage||"unknown",freshness:row.freshness||"unknown",sourceReceipt:row.source_receipt||{},detail:row.detail||"",verified:true};const index=thesis.watchEvents.findIndex(item=>item.id===row.id);if(index>=0)thesis.watchEvents[index]=remoteEvent;else thesis.watchEvents.push(remoteEvent);}
    thesis.watchEvents.sort((a,b)=>Date.parse(b.evaluatedAt||"")-Date.parse(a.evaluatedAt||""));

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
      if(conditionChoice==="local"&&(t.condition||t.watchRule||remoteCondition)){t.conditionId ||= t.watchRule?.id || remoteCondition?.id || crypto.randomUUID();if(t.watchRule)t.watchRule.id=t.conditionId;const rule=t.watchRule;const body={condition_type:rule?"threshold":"qualitative",metric_key:rule?.metricKey||"user_defined",operator:rule?.operator||null,threshold:rule?.threshold??null,unit:rule?.unit||null,effect:rule?.effect||"weaken",description:rule?.description||t.condition||"",active:rule?rule.active!==false:(t.conditionActive===undefined?!!t.condition:!!t.conditionActive),updated_at:rule?.updatedAt||new Date().toISOString()};if(remoteCondition)await request(`/rest/v1/thesis_conditions?id=eq.${encodeURIComponent(remoteCondition.id)}&owner_id=eq.${encodeURIComponent(owner)}`,{method:"PATCH",body,prefer:"return=minimal"});else await request("/rest/v1/thesis_conditions?on_conflict=id",{method:"POST",body:{id:t.conditionId,owner_id:owner,thesis_id:t.id,...body},prefer:"resolution=merge-duplicates,return=minimal"});}
      for(const review of t.reviews||[]){review.id ||= crypto.randomUUID();review.snapshotId ||= crypto.randomUUID();await request("/rest/v1/thesis_snapshots?on_conflict=id",{method:"POST",body:{id:review.snapshotId,owner_id:owner,thesis_id:t.id,snapshot_kind:"manual_review",source_provider:review.snapshot?.sourceProvider||"unavailable",source_endpoint:review.snapshot?.sourceEndpoint||null,source_observed_at:review.snapshot?.sourceObservedAt??null,captured_at:review.snapshot?.capturedAt||review.date,source_payload:{assetSymbol:t.assetSymbol||null,retrievedAt:review.snapshot?.retrievedAt??null,review:review.snapshot||null},derived_metrics:review.snapshot?.derivedMetrics||{},coverage:review.snapshot?.coverage||"unavailable",limitations:review.snapshot?.limitations||"No fresh source snapshot was captured at review time."},prefer:insertOnly});await request("/rest/v1/thesis_reviews?on_conflict=id",{method:"POST",body:{id:review.id,owner_id:owner,thesis_id:t.id,snapshot_id:review.snapshotId,reviewed_at:review.date,result_label:review.result,summary:review.note||""},prefer:insertOnly});}
    }
    const remote=await fetchAllRows(`/rest/v1/theses?select=*&owner_id=eq.${encodeURIComponent(owner)}&order=created_at.desc,id.desc`);
    const history={evidence:[],reviews:[],snapshots:[],conditions:[],events:[]};
    const remoteRows=remote||[];
    for(let offset=0;offset<remoteRows.length;offset+=50){
      const group=remoteRows.slice(offset,offset+50);
      const ids=group.map(row=>row.id).filter(Boolean).join(",");
      if(!ids)continue;
      const filter=`/rest/v1/evidence_items?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`;
      const [evidence,reviews,snapshots,conditions,events]=await Promise.all([
        fetchAllRows(filter),
        fetchAllRows(`/rest/v1/thesis_reviews?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`),
        fetchAllRows(`/rest/v1/thesis_snapshots?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`),
        fetchAllRows(`/rest/v1/thesis_conditions?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`),
        fetchAllRows(`/rest/v1/thesis_condition_events?select=*&owner_id=eq.${encodeURIComponent(owner)}&thesis_id=in.(${ids})`)
      ]);
      history.evidence.push(...(evidence||[]));history.reviews.push(...(reviews||[]));history.snapshots.push(...(snapshots||[]));history.conditions.push(...(conditions||[]));history.events.push(...(events||[]));
    }
    const reconciled=reconcileThesisHistory(theses,remoteRows,history.evidence,history.reviews,history.snapshots,history.conditions,history.events);
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
  document.getElementById("rwa-refresh").addEventListener("click",()=>{state.rwa.loadedAt=0;loadRwa();});
  document.getElementById("rwa-search").addEventListener("input",e=>{state.rwa.query=e.target.value;renderRwa();});
  document.querySelectorAll("[data-rwa-type]").forEach(button=>button.addEventListener("click",()=>{
    state.rwa.filter=button.dataset.rwaType;
    document.querySelectorAll("[data-rwa-type]").forEach(item=>item.classList.toggle("selected",item===button));
    renderRwa();
  }));
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
  document.getElementById("notification-button").addEventListener("click",openReviewInbox);
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
