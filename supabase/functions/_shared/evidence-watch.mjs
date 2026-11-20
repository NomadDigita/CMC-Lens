export function evaluateCondition({ condition, asset, mode, expectedAssetId, now = Date.now(), maxAgeMs = 15 * 60 * 1000, receiptValid = false }) {
  const metricKey = condition?.metric_key || condition?.metricKey;
  const operator = condition?.operator;
  const thresholdValue = condition?.threshold;
  const threshold = thresholdValue === null || thresholdValue === undefined || thresholdValue === "" ? NaN : Number(thresholdValue);
  const cryptoMetrics = ["change_24h_pct", "market_cap_usd"];
  const rwaMetrics = ["rwa_price_coverage_pct", "rwa_price_range_pct", "rwa_top_issuer_volume_share_pct"];
  const expectedRwaId = String(expectedAssetId || "").replace(/^rwa:/, "");
  const isRwa = String(expectedAssetId || "").startsWith("rwa:");
  const supportedMetric = isRwa ? rwaMetrics.includes(metricKey) : cryptoMetrics.includes(metricKey);
  const supportedOperator = ["lt", "lte", "gt", "gte"].includes(operator);

  if (!supportedMetric || !supportedOperator || !Number.isFinite(threshold)) {
    return { outcome: "unknown", observedValue: null, freshness: "unknown", detail: "This rule is incomplete or unsupported. No result was inferred." };
  }
  if (mode === "demo") {
    return { outcome: "unknown", observedValue: null, freshness: "unavailable", detail: "The endpoint returned labelled demo data. Demo values are never evaluated as live evidence." };
  }
  if (mode !== "live" || !asset) {
    return { outcome: "unknown", observedValue: null, freshness: "unavailable", detail: "Fresh CoinMarketCap evidence was unavailable; no rule result was inferred." };
  }
  const returnedAssetId = isRwa ? String(asset.rwa_id || "") : String(asset.id || "");
  if (returnedAssetId !== expectedRwaId) {
    return { outcome: "unknown", observedValue: null, freshness: "unknown", detail: "The returned asset ID did not match the thesis asset. No rule result was inferred." };
  }

  const observedAtValue = isRwa ? asset.last_updated : asset.observedAt;
  const observedAt = typeof observedAtValue === "string" ? Date.parse(observedAtValue) : NaN;
  if (!Number.isFinite(observedAt)) {
    return { outcome: "unknown", observedValue: null, freshness: "missing", detail: "The CMC quote had no source timestamp. No rule result was inferred." };
  }
  if (observedAt > now + 5 * 60 * 1000 || now - observedAt > maxAgeMs) {
    return { outcome: "unknown", observedValue: null, freshness: "stale", detail: "The CMC source timestamp was stale or unexpectedly ahead of the check. No rule result was inferred." };
  }
  if (!receiptValid) {
    return { outcome: "unknown", observedValue: null, freshness: "unavailable", detail: "The source receipt could not verify a successful or cached CMC quote. No rule result was inferred." };
  }

  let raw;
  let coverage = "complete";
  if (!isRwa) {
    raw = metricKey === "change_24h_pct" ? asset.change24h : asset.marketCap;
  } else {
    const tokens = Array.isArray(asset.tokens) ? asset.tokens : [];
    const numeric = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
    const prices = tokens.map(token => token?.price).filter(numeric).map(Number);
    const volumes = new Map();
    let totalPositiveVolume = 0;
    let unattributedPositiveVolume = 0;
    for (const token of tokens) {
      const issuer = String(token?.issuer_name || "").trim();
      const volume = token?.volume_24h;
      if (!numeric(volume) || Number(volume) <= 0) continue;
      totalPositiveVolume += Number(volume);
      if (!issuer) {
        unattributedPositiveVolume += Number(volume);
        continue;
      }
      volumes.set(issuer, (volumes.get(issuer) || 0) + Number(volume));
    }
    if (metricKey === "rwa_price_coverage_pct") {
      coverage = tokens.length ? (prices.length === tokens.length ? "complete" : "partial") : "unavailable";
      raw = tokens.length ? prices.length / tokens.length * 100 : null;
    } else if (metricKey === "rwa_price_range_pct") {
      const average = asset.average_tokenized_price;
      coverage = prices.length >= 2 && numeric(average) && Number(average) > 0 ? (prices.length === tokens.length ? "complete" : "partial") : "unavailable";
      raw = prices.length >= 2 && numeric(average) && Number(average) > 0 ? (Math.max(...prices) - Math.min(...prices)) / Number(average) * 100 : null;
    } else {
      coverage = totalPositiveVolume > 0 ? (unattributedPositiveVolume > 0 ? "partial" : "complete") : "unavailable";
      raw = totalPositiveVolume > 0 && volumes.size ? Math.max(...volumes.values()) / totalPositiveVolume * 100 : null;
    }
  }
  const observedValue = raw === null || raw === undefined || raw === "" || !Number.isFinite(Number(raw)) ? null : Number(raw);
  if (observedValue === null) {
    return { outcome: "unknown", observedValue: null, freshness: "missing", detail: "The CMC quote did not contain this metric. Missing and zero are distinct; no rule result was inferred." };
  }

  const passed = operator === "lt" ? observedValue < threshold :
    operator === "lte" ? observedValue <= threshold :
    operator === "gt" ? observedValue > threshold : observedValue >= threshold;
  return {
    outcome: passed ? "met" : "not_met",
    observedValue,
    freshness: "fresh",
    coverage,
    detail: (isRwa ? "Live CMC tokenized-market evidence" : "Live CMC quote") + " compared with the saved threshold using " + operator + ". This result adds context; it does not explain the cause of a move.",
  };
}
