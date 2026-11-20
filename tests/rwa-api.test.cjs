const test = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/market.js");

test("RWA source receipts count returned assets and summarize each CMC endpoint", async () => {
  const originalKey = process.env.CMC_PRO_API_KEY;
  const originalFetch = global.fetch;
  process.env.CMC_PRO_API_KEY = "test-only-key";
  const calls = [];
  const responses = {
    "/v5/real-world-assets/assets/list": {
      total_size: 1, has_more: false,
      rwa_assets: [{ rwa_id: 2, name: "NVIDIA", symbol: "NVDA", has_tokens: true, last_updated: "2026-11-20T11:00:00.000Z" }],
    },
    "/v5/real-world-assets/info": {
      rwa_assets: [{ rwa_id: 2, name: "NVIDIA", symbol: "NVDA", about: { logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png" } }],
    },
    "/v5/real-world-assets/quotes/latest": {
      rwa_assets: [{ rwa_id: 2, symbol: "NVDA", average_tokenized_price: 100, tokens: [{ crypto_id: 1, issuer_name: "Issuer A", volume_24h: 10 }] }],
    },
  };
  global.fetch = async url => {
    const path = new URL(url).pathname;
    calls.push(path);
    return { ok: true, status: 200, json: async () => ({ status: { error_code: 0 }, data: responses[path] }) };
  };
  try {
    const result = await new Promise((resolve, reject) => {
      const res = {
        headers: {},
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(body) { resolve({ statusCode: this.statusCode, body }); return this; },
      };
      handler({ method: "GET", query: { view: "rwa" } }, res).catch(reject);
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.assets.length, 1);
    assert.deepEqual(result.body.sourceReceipts.map(row => row.recordCount), [1, 1, 1]);
    assert.equal(result.body.sourceReceipts[0].responseSummary.returnedAssets, 1);
    assert.equal(result.body.sourceReceipts[1].responseSummary.assets[0].hasLogo, true);
    assert.equal(result.body.sourceReceipts[2].responseSummary.assets[0].tokenCount, 1);
    assert.deepEqual(calls.sort(), Object.keys(responses).sort());
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CMC_PRO_API_KEY;
    else process.env.CMC_PRO_API_KEY = originalKey;
  }
});
