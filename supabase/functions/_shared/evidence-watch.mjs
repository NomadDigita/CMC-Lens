export function evaluateCondition({ condition, asset, mode, expectedAssetId, now = Date.now(), maxAgeMs = 15 * 60 * 1000, receiptValid = false }) {
  const metricKey = condition?.metric_key || condition?.metricKey;
  const operator = condition?.operator;
  const thresholdValue = condition?.threshold;
  const threshold = thresholdValue === null || thresholdValue === undefined || thresholdValue === "" ? NaN : Number(thresholdValue);
  const supportedMetric = ["change_24h_pct", "market_cap_usd"].includes(metricKey);
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
  if (String(asset.id || "") !== String(expectedAssetId || "")) {
    return { outcome: "unknown", observedValue: null, freshness: "unknown", detail: "The returned asset ID did not match the thesis asset. No rule result was inferred." };
  }

  const observedAt = typeof asset.observedAt === "string" ? Date.parse(asset.observedAt) : NaN;
  if (!Number.isFinite(observedAt)) {
    return { outcome: "unknown", observedValue: null, freshness: "missing", detail: "The CMC quote had no source timestamp. No rule result was inferred." };
  }
  if (observedAt > now + 5 * 60 * 1000 || now - observedAt > maxAgeMs) {
    return { outcome: "unknown", observedValue: null, freshness: "stale", detail: "The CMC source timestamp was stale or unexpectedly ahead of the check. No rule result was inferred." };
  }
  if (!receiptValid) {
    return { outcome: "unknown", observedValue: null, freshness: "unavailable", detail: "The source receipt could not verify a successful or cached CMC quote. No rule result was inferred." };
  }

  const raw = metricKey === "change_24h_pct" ? asset.change24h : asset.marketCap;
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
    detail: "Live CMC quote compared with the saved threshold using " + operator + ". This result adds context; it does not explain the cause of a move.",
  };
}
