# Release 3 Plan — Evidence Watch

**Status:** Crypto MVP and RWA Evidence Watch shipped; authenticated end-to-end verification remains pending
**Product goal:** Let researchers define observable conditions for an existing thesis and see when fresh CMC evidence meets them.

## Why this release

A thesis already stores the question, baseline, review date, and a written condition. Today the condition is descriptive text; a researcher has to remember to check again. Evidence Watch turns a condition into an inspectable rule while keeping the interpretation with the user. It makes CMC Lens a research follow-through tool rather than another price alert feed.

## User flow

1. A researcher adds one rule per thesis using an allowlisted CMC metric, operator, threshold, and effect label: strengthen, weaken, or invalidate. Crypto rules use the 24-hour change or market capitalization. RWA rules use priced-token coverage, token-price range against CMC's tokenized average, or largest issuer share of positive reported token volume.
2. The UI explains the metric, units, source coverage, and whether that metric is available for the selected asset type.
3. A check runs only after a user refresh or when a review is opened. Each rule returns **met**, **not met**, or **unknown**. Missing fields, stale data, failed upstream calls, and unsupported metrics return unknown.
4. Each result shows the measured value, threshold, source endpoint, source observation time, retrieval time, coverage, and method.
5. The result is appended to the thesis history. It never edits the baseline or prior checks. The researcher writes the interpretation and decides what to do next.

## First supported rules

| Asset type | Metric | Example rule | Boundaries |
| --- | --- | --- | --- |
| Crypto asset | 24h change | 24h change falls below −8% | Quote observation time and selected CMC ID must be present |
| Crypto asset | Market cap | Market cap drops below a saved threshold | Null and zero stay distinct |
| RWA underlying | Price coverage | Priced token count falls below 80% | Denominator is CMC-returned instruments for that underlying |
| RWA underlying | Token price range | Range against CMC tokenized average rises above 1% | Not a parity or arbitrage claim |
| RWA underlying | Issuer volume share | Largest issuer share exceeds 60% | Uses positive 24h volume only and only the returned token rows |

No social or news interpretation, synthetic metric, AI-generated trade call, or automatic order is part of this release.

## Data and security design

- Reuse `thesis_conditions` for the user's rule definition only after verifying its existing constraints and RLS policies.
- Add an append-only `thesis_condition_events` table for results: owner, thesis, condition, idempotency key, outcome, observed value, saved rule snapshot, source provider and endpoint, source time, evaluation time, coverage/freshness, and minimized redacted receipt. Authenticated users may read their own events; only the trusted Edge Function writes them.
- Enforce owner access with RLS. A server evaluation endpoint must verify the Supabase user and thesis ownership before requesting CMC data.
- Never put the CMC API key in the browser or store raw provider payloads, request headers, or credentials in an event.
- Start with user-triggered checks. Evaluate scheduled Vercel jobs only after API credit limits, free-tier cron constraints, idempotency, and retry behavior have been verified.
- Keep email, push, and browser notifications opt-in and separate from the rule engine.

## UX requirements

- Place the rules beside the saved thesis condition and show a visible “last checked” time.
- Keep rule state separate from thesis status: a met rule does not mark a thesis as correct or successful.
- Display a clear unknown state when evidence is missing, stale, unavailable, or unsupported.
- Provide a compact method view and a history of every evaluation.
- Support keyboard use, screen readers, dark and light themes, and narrow phone screens.
- Allow users to pause or remove a recoverable rule; preserve prior events as historical evidence.

## Delivery sequence

1. Audit the live schema, RLS, auth callback, CMC endpoint access, caching, and existing local/cloud sync behavior.
2. Finalize the rule model and migration; review RLS and insert-only event policy.
3. Implement deterministic validators and unit-level edge cases for nulls, zero values, stale timestamps, wrong asset IDs, and provider failures.
4. Build the one-rule editor and append-only check history in the thesis detail view; preserve legacy qualitative condition text and sync pause state.
5. Add an authenticated evaluation route with safe parameter allow-lists, rate limits, CMC receipts, and no secret-bearing errors.
6. Exercise crypto, RWA, partial-coverage, missing-volume, demo, unavailable, signed-out, and account-switch paths.
7. Verify accessible desktop/mobile layouts and both themes in the live Vercel deployment.
8. Add scheduled checks only after an explicit quota and operations review.

## Release acceptance

- Every result is reproducible from its saved rule, value, source identity, timestamps, coverage, and method version.
- Unsupported or missing evidence never triggers a false “met” result.
- Baselines and earlier evaluation events remain immutable.
- Cross-user reads and writes are rejected by RLS and endpoint ownership checks.
- User wording and interpretation remain user-authored; the product makes no prediction or execution decision.

## Current repo checkpoint · November 20, 2026

- PR #41 is merged into `main` (merge commit `4049b4e`). It adds three RWA checks: priced-token coverage, price range against CMC's tokenized average, and largest issuer share of positive reported token volume. Partial price sets and unattributed positive volume remain unknown where complete coverage is required.
- The RWA rule editor and check history are in `public/app.js`; results record the method, endpoint, source time, retrieval time, coverage, and freshness. Token-volume attribution groups by stable `issuer_id`; source receipts retain CMC list, info, and quote endpoint provenance.
- The evaluator separates source freshness from evidence completeness: incomplete evidence can be `unknown` with `partial` coverage while its observation is still `fresh`. Narrow RWA detail panels use a compact readable token-row layout.
- The 18 repository tests passed before merge. Supabase project `cmc-lens` is healthy; `evaluate-thesis-condition` is active at version 4 with JWT verification enabled. Vercel production deployment for merge commit `4049b4e` is `READY`.
- Production review confirms live RWA data and coverage metrics. PR #42 adds a responsive fallback; the fresh production deployment now shows readable token names, price dispersion, volume, and issuer rows at standard desktop width. Remaining verification: complete an authenticated production thesis evaluation. Submission proof remains pending: sanitized real request/response, demo recording, X post, and verified DoraHacks submission/registration state are not yet recorded.
