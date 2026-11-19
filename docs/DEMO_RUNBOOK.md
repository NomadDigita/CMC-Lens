# CMC Lens — Demo and Recording Runbook

**Target length:** 90–120 seconds  
**Audience:** CMC API hackathon judges and independent crypto researchers  
**Primary track:** Data and Visualisation (recommended; select it in DoraHacks before submission)

## Before recording

- Open [the production app](https://cmc-lens.vercel.app/) and refresh until the CMC live-data badge and current source time are visible.
- Use a separate demo account or guest workspace for any new thesis record.
- Do not show credentials, private email/profile details, browser autofill, or personal notes.
- Confirm the source inspector shows live receipts. If it says demo, stop and say the data is illustrative; do not present demo values as a CMC response.
- Confirm at least one historical comparison is available before promising a replay result. History is plan-dependent and budgeted.

## Walkthrough

### 0:00–0:15 — State the problem

“CMC Lens helps me turn a market move into a research record I can revisit. It keeps CMC observations, calculations, and my own interpretation separate.”

Show the Market Pulse live/demo indicator and CMC attribution.

### 0:15–0:40 — Find a move in Market Atlas

Open **Market Atlas**. Point out the top-100-by-market-cap scope, current quote coverage, absolute 24-hour return on the horizontal axis, and relative return against covered category peers on the vertical axis. Change one category or market-cap filter, then select an asset. Mention that missing category/peer coverage remains blank rather than being estimated.

### 0:40–0:55 — Prove the source

Open **Inspect source**. Show the endpoint path, safe query parameters, upstream status, count, and source/retrieval times. The latest verified production overview included successful responses from /v1/global-metrics/quotes/latest, /v3/fear-and-greed/latest, and /v3/cryptocurrency/listings/latest. Do not show request headers, keys, or raw payloads.

### 0:55–1:20 — Compare the same assets

Add two or three assets to the research cohort and choose **Compare selected**. Show the common window and matched CMC IDs. If live historical quotes are returned, point out that gaps remain visible. If CMC denies or lacks history, show the explicit unavailable state and explain that history depends on API entitlement.

### 1:20–1:45 — Preserve the reasoning

Choose **Save as thesis**. Record a concise question, what supports it, what conflicts with it, and one condition that would change the view. Show that the record carries a baseline and can be reviewed later; do not describe the thesis as an automated recommendation.

## Closing line

“CMC gives this workflow live market context, stable asset IDs, tags, current quotes, and—when the account plan permits—historical quotes. Tags are incomplete and not a canonical sector taxonomy, so CMC Lens discloses unclassified assets and only computes relative returns for covered peers. The Atlas is a top-100 sample, not the whole market.”

## Capture checklist

- [ ] Screen recording shows the deployed app and responsive readable text.
- [ ] Live CMC state and attribution are visible.
- [ ] At least one in-product source receipt is readable.
- [ ] Public repo and deployment links are visible in the recording description.
- [ ] API limitation note is in the DoraHacks entry.
- [ ] No API key, user email, auth token, or private thesis is visible.
- [ ] Upload the recording, then use its public URL in both the DoraHacks entry and required X post.
