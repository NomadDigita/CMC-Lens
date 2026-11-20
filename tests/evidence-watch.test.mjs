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
