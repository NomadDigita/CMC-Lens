import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCondition } from "../supabase/functions/_shared/evidence-watch.mjs";

const now = Date.parse("2026-11-20T12:00:00.000Z");
const condition = { metric_key: "change_24h_pct", operator: "lte", threshold: -8 };
const asset = { id: "1", change24h: -8, marketCap: 2500000, observedAt: "2026-11-20T11:59:00.000Z" };

test("zero remains a valid numeric value", () => {
  const result = evaluateCondition({
    condition: { ...condition, threshold: 0 },
    asset: { ...asset, change24h: 0 },
    mode: "live",
    expectedAssetId: "1",
    now,
    receiptValid: true,
  });
  assert.equal(result.outcome, "met");
  assert.equal(result.observedValue, 0);
});

test("an exact boundary uses the selected inclusive operator", () => {
  const result = evaluateCondition({ condition, asset, mode: "live", expectedAssetId: "1", now, receiptValid: true });
  assert.equal(result.outcome, "met");
  assert.equal(result.observedValue, -8);
});

test("stale evidence is unknown", () => {
  const result = evaluateCondition({
    condition,
    asset: { ...asset, observedAt: "2026-11-20T11:00:00.000Z" },
    mode: "live",
    expectedAssetId: "1",
    now,
    receiptValid: true,
  });
  assert.equal(result.outcome, "unknown");
  assert.equal(result.freshness, "stale");
});

test("demo values are never evaluated", () => {
  const result = evaluateCondition({ condition, asset, mode: "demo", expectedAssetId: "1", now, receiptValid: true });
  assert.equal(result.outcome, "unknown");
  assert.equal(result.freshness, "unavailable");
});

test("wrong asset IDs are unknown", () => {
  const result = evaluateCondition({ condition, asset, mode: "live", expectedAssetId: "2", now, receiptValid: true });
  assert.equal(result.outcome, "unknown");
});

test("missing metric is unknown while zero is preserved", () => {
  const result = evaluateCondition({
    condition,
    asset: { ...asset, change24h: null },
    mode: "live",
    expectedAssetId: "1",
    now,
    receiptValid: true,
  });
  assert.equal(result.outcome, "unknown");
  assert.equal(result.observedValue, null);
});

test("a missing source receipt cannot produce met or not met", () => {
  const result = evaluateCondition({ condition, asset, mode: "live", expectedAssetId: "1", now, receiptValid: false });
  assert.equal(result.outcome, "unknown");
});

const rwaAsset = {
  rwa_id: 9,
  average_tokenized_price: 100,
  last_updated: "2026-11-20T11:59:00.000Z",
  tokens: [
    { price: 99, issuer_name: "Issuer A", volume_24h: 40 },
    { price: 101, issuer_name: "Issuer A", volume_24h: 20 },
    { price: 100, issuer_name: "Issuer B", volume_24h: 40 },
    { price: null, issuer_name: "Issuer C", volume_24h: 0 },
  ],
};

test("RWA price coverage uses only CMC-returned instruments with numeric prices", () => {
  const result = evaluateCondition({
    condition: { metric_key: "rwa_price_coverage_pct", operator: "lt", threshold: 80 },
    asset: rwaAsset, mode: "live", expectedAssetId: "rwa:9", now, receiptValid: true,
  });
  assert.equal(result.outcome, "met");
  assert.equal(result.observedValue, 75);
  assert.equal(result.coverage, "partial");
});

test("RWA token price range is measured against the CMC tokenized average", () => {
  const result = evaluateCondition({
    condition: { metric_key: "rwa_price_range_pct", operator: "gte", threshold: 2 },
    asset: rwaAsset, mode: "live", expectedAssetId: "rwa:9", now, receiptValid: true,
  });
  assert.equal(result.outcome, "met");
  assert.equal(result.observedValue, 2);
});

test("RWA token price range reads the USD quote average when the normalized field is absent", () => {
  const { average_tokenized_price, ...asset } = rwaAsset;
  const result = evaluateCondition({
    condition: { metric_key: "rwa_price_range_pct", operator: "gte", threshold: 2 },
    asset: { ...asset, quotes: { USD: { average_tokenized_price: average_tokenized_price } } },
    mode: "live", expectedAssetId: "rwa:9", now, receiptValid: true,
  });
  assert.equal(result.outcome, "met");
  assert.equal(result.observedValue, 2);
});

test("RWA freshness reads the USD quote timestamp when the asset timestamp is absent", () => {
  const { last_updated, ...asset } = rwaAsset;
  const result = evaluateCondition({
    condition: { metric_key: "rwa_price_coverage_pct", operator: "gte", threshold: 75 },
    asset: { ...asset, quotes: { USD: { average_tokenized_price: 100, last_updated } } },
    mode: "live", expectedAssetId: "rwa:9", now, receiptValid: true,
  });
  assert.equal(result.outcome, "met");
  assert.equal(result.freshness, "fresh");
});

test("RWA issuer share groups positive token volumes by issuer", () => {
  const result = evaluateCondition({
    condition: { metric_key: "rwa_top_issuer_volume_share_pct", operator: "gt", threshold: 55 },
    asset: rwaAsset, mode: "live", expectedAssetId: "rwa:9", now, receiptValid: true,
  });
  assert.equal(result.outcome, "met");
  assert.equal(result.observedValue, 60);
});

test("RWA issuer share is unknown when positive volume lacks issuer attribution", () => {
  const result = evaluateCondition({
    condition: { metric_key: "rwa_top_issuer_volume_share_pct", operator: "gt", threshold: 54 },
    asset: { ...rwaAsset, tokens: [...rwaAsset.tokens, { volume_24h: 10 }] },
    mode: "live", expectedAssetId: "rwa:9", now, receiptValid: true,
  });
  assert.equal(result.outcome, "unknown");
  assert.equal(result.observedValue, null);
  assert.equal(result.coverage, "partial");
  assert.match(result.detail, /no issuer attribution/i);
});

test("RWA price spread is unknown when there are fewer than two priced tokens", () => {
  const result = evaluateCondition({
    condition: { metric_key: "rwa_price_range_pct", operator: "gt", threshold: 1 },
    asset: { ...rwaAsset, tokens: [{ price: 100, volume_24h: 0 }] },
    mode: "live", expectedAssetId: "rwa:9", now, receiptValid: true,
  });
  assert.equal(result.outcome, "unknown");
  assert.equal(result.observedValue, null);
});

test("RWA rule rejects a mismatched underlying ID", () => {
  const result = evaluateCondition({
    condition: { metric_key: "rwa_price_coverage_pct", operator: "gte", threshold: 80 },
    asset: rwaAsset, mode: "live", expectedAssetId: "rwa:10", now, receiptValid: true,
  });
  assert.equal(result.outcome, "unknown");
});
