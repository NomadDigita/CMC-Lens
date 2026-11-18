# Release 2 Plan — Comparison Evidence and Market Integrity

**Status:** In progress  
**Branch:** `feat/comparison-evidence-release`  
**Plan date:** 2026-11-18

## Release outcome

A researcher can compare two to four assets, capture that comparison into a thesis, and later review a fresh observation against the thesis baseline. Each displayed calculation must distinguish source data, derived context, demo values, and unavailable data.

This release strengthens the product's core research loop. It does not introduce trading instructions, sentiment-generated recommendations, or account-wide sharing.

## User problem

A chart comparison is easy to lose once a user changes screens. A thesis written afterward can omit which assets, period, and quote values informed it. Separately, a broad “market breadth” percentage can mislead when unchanged or missing quotes are silently counted as declines, and approximate tag matching can put unrelated projects in a peer group.

## Release scope

### 1. Comparison-to-thesis handoff

- Keep the selected comparison period and two to four distinct CMC asset IDs.
- Start a thesis from the comparison and preselect its primary asset.
- Preserve the original selected asset IDs, price, 24h change, market cap, volume, peer context, source provider, quote timestamps, coverage, and capture time with the baseline snapshot.
- Preserve cached selected-period historical price points by asset ID when available; say when history was not loaded, and never synthesize live evidence.
- Reopen a thesis and inspect the original comparison even if current comparison selections have changed.
- Keep the user’s interpretation and conditions editable; do not generate a score or buy/sell direction.

### 2. Review snapshots

- Append a dated review without altering the original baseline or prior reviews.
- Preserve source retrieval time separately from source observation time, including a null source timestamp when the provider did not supply one.
- Retrieve a fresh CMC quote only for a valid CMC numeric asset ID and verify the response ID matches it.
- Preserve a missing source timestamp as missing; retrieval time is shown separately.
- Derive price change only when baseline and review prices are valid and source contexts are comparable.
- Identify demo and unavailable observations clearly.

### 3. Market-data integrity

- Match known peer categories by normalized, exact CMC tag aliases rather than substring guesses.
- Exclude the asset itself from its peer mean; fall back to a covered market cohort when no same-category peer exists.
- Normalize invalid numeric values to null while preserving meaningful zero values.
- Report rising, falling, flat, missing, covered universe, and quote coverage separately.
- Keep optional Fear & Greed data isolated: a timeout or provider error must not break the main overview, and the UI must show the observed timestamp and classification when supplied.

### 4. Account and persistence safety

- Continue to keep guest records local and signed-in records scoped to the authenticated user.
- Guard in-flight reads/writes across logout and account switches; never apply one account's response to another session.
- Persist baseline and review snapshots as append-only records; respect Supabase row-level security.
- Keep API credentials on the server and out of browser storage and repository history.

## Delivery sequence

1. Review current production baseline, API contract, existing snapshot schema, and auth/session boundaries.
2. Implement and review API normalization, exact cohorts, coverage counts, and optional sentiment fallback.
3. Implement comparison capture, thesis handoff, saved comparison rendering, and review source validation.
4. Exercise live and demo states, invalid/missing quote fields, empty peer cohorts, and account-switch timing.
5. Open a pull request with the data contract, limitations, and verification notes.
6. Merge only after code review and CI are clean; confirm the production deployment is ready.
7. Verify the deployed dashboard, compare flow, thesis snapshot, and dark/light themes on desktop and mobile.
8. Record follow-up issues for broader auth recovery and submission/demo polish.

## Acceptance criteria

- A selected comparison converts into a thesis without losing the exact IDs, period, or available quote snapshot.
- Reopening the thesis shows the saved comparison independently of current selections.
- No absent, non-finite, or stale-mismatched value is presented as zero, a decline, or a fresh CMC quote.
- Peer context excludes self-comparison and never treats a missing change as zero.
- Breadth clearly separates known rises, declines, flats, and missing coverage.
- Optional sentiment failure leaves core market data usable.
- No cross-account sync response can replace the active account's records after logout or account switch.
- No secret or user token is exposed in committed assets.
- A production deploy is checked after merge in both dark and light themes.

## Known limitations and follow-up

- A CMC quote snapshot cannot explain why a price moved; users must add their own thesis and evidence.
- Peer averages from the top 100 listings are a useful comparison, not a full-market sector index.
- The Fear & Greed signal is optional context, not a prediction or investment recommendation.
- Historical comparison availability and API plan limits must be surfaced rather than implied.
- Release 3 should focus on reliable cross-device restore, explicit evidence links, accessible chart summaries, and a concise recorded demo after this release is live.
