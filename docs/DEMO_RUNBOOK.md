# CMC Lens — Demo and Recording Runbook

**Target length:** 90–120 seconds  
**Audience:** CMC API hackathon judges and independent crypto researchers  
**Primary track:** Real World Assets (recommended; select it in DoraHacks before submission)

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

### 0:15–0:40 — Inspect one underlying across issuers

Open **RWA Desk** and select NVIDIA or Gold. Show the CMC tokenized average, reported issuer instruments, missing prices, and dispersion against the tokenized average. Then point out quote coverage, volume coverage, price range, and each issuer's share of reported token volume. State that concentration is limited to returned token rows and does not describe the underlying market.

### 0:40–0:55 — Prove the source

Open the source receipt for the selected RWA detail. Show `/v5/real-world-assets/quotes/latest` and `/v5/real-world-assets/info`, their safe request parameters, upstream status, record counts, and retrieval times. Do not show request headers, keys, or raw payloads.

### 0:55–1:20 — Preserve and revisit the comparison

Choose **Save issuer comparison**. Explain that the baseline preserves token values, source receipts, quote coverage, volume coverage, and issuer concentration. In a follow-up review, show the new snapshot beside the frozen baseline; missing instruments remain missing rather than being treated as zero.

### 1:20–1:45 — Preserve the reasoning

Record a concise question, what supports it, what conflicts with it, and one condition that would change the view. Show that the record carries an issuer baseline and can be reviewed later; do not describe the thesis as an automated recommendation.

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
