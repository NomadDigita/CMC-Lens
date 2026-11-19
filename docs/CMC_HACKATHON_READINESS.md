# CMC API Hackathon Readiness

**Last checked:** November 19, 2026  
**Event:** [Build with CMC: API Hackathon, Round 2](https://coinmarketcap.com/api/ja/resources/api-hackathon-2026-11/)  
**Submission window:** November 18–December 9, 2026; closes December 9 at 23:59 UTC  
**Recommended track:** Data and Visualisation  
**Project:** CMC Lens — a research workspace for exploring CMC market data, comparing matched assets, and reviewing dated theses.

The repository and CMC integration predate this event. The hackathon-specific contribution is clearly identified as the live Market Atlas and matched-window comparison replay: the Atlas explores CMC's top-100-by-market-cap listings with category-relative context and coverage; replay revisits the same saved CMC IDs across a matched date window and keeps missing observations visible.

## Official submission requirements

The official CMC event page requires each entry to include:

- A public GitHub repository.
- A working demo/deployed link or a short screen recording.
- One selected track.
- CMC API endpoint names.
- Visible evidence of a real API request and response.
- A short note on what the API enabled and where it created friction.
- An X post linking the DoraHacks submission and demo video, with #BuildwithCMC; paste that post URL into the submission form.

The public repo, live demo, named endpoints, and redacted live receipts are available now. **Event registration, track selection in DoraHacks, BUIDL submission, recording publication, and X post are not confirmed.** Do not mark the entry submitted until the public DoraHacks page and required X URL have both been verified. See the official event page for the authoritative current rules.

## What is being submitted

CMC Lens is not a generic price dashboard. It helps an independent researcher ask whether a move is broad or asset-specific, preserve the exact CMC IDs and observations behind a comparison, record the question and conditions that would change their view, then append later reviews without rewriting the original evidence.

**Primary track rationale:** Data and Visualisation best fits the Market Atlas, matched comparisons, and provenance-first research workflow. Track selection remains to be made in the DoraHacks form.

## CMC API endpoints used

All CMC requests are made server-side through api/market.js. The key is read from CMC_PRO_API_KEY; it must never appear in client code, screenshots, logs, docs, or Git history.

| CMC endpoint | Product use |
| --- | --- |
| /v1/global-metrics/quotes/latest | Global market capitalization and BTC dominance |
| /v3/fear-and-greed/latest | Optional sentiment context, failure-isolated from core market data |
| /v3/cryptocurrency/listings/latest | Top-100 market-cap sample, live quotes, and category tags |
| /v1/cryptocurrency/map | Search asset names/symbols and resolve numeric CMC IDs |
| /v3/cryptocurrency/quotes/latest | Current asset details and fresh thesis review quotes |
| /v3/cryptocurrency/quotes/historical | Matched comparison and historical replay, subject to plan access |

Internal app route: GET /api/market supplies the live overview; asset/search/history views use validated server routes. Source receipts expose safe params and normalized summaries, never API keys, request headers, or raw CMC payloads.

## Verified live API evidence

On **November 19, 2026 at 05:46 UTC**, the production GET /api/market route returned HTTP 200 in live mode. It reported 100 queried, 100 covered, and 0 missing listings for the explicitly scoped top-100-by-market-cap universe. The in-product receipt showed successful upstream HTTP 200 responses for:

| Endpoint | Safe query parameters | Records |
| --- | --- | ---: |
| /v1/global-metrics/quotes/latest | convert=USD | 1 |
| /v3/fear-and-greed/latest | none | 1 |
| /v3/cryptocurrency/listings/latest | start=1, limit=100, convert=USD, sort=market_cap, sort_dir=desc, aux=tags | 100 |

This is a timestamped check, not a guarantee that every future request will succeed. Judges can reproduce it through the live app's **Inspect source** receipt. The public implementation is in api/market.js; CMC attribution is visible in the UI. No credential or raw response was captured in this evidence.

## What CMC made possible and API friction

**Enabled:** CMC supplies stable numeric asset IDs, current quote and market-cap fields, broad listings, tag metadata, global context, sentiment context, and historical quotes. Together these support a live top-100 rotation map and comparisons that can revisit the same saved assets later.

**Observed friction and product response:** Listing tags are not a complete canonical taxonomy; some assets have no recognized category and others have multiple tags. CMC Lens assigns one deterministic primary category, reports peer coverage, and leaves relative return null when no recognized category/covered peer sample exists. The listings route is a bounded top-100 sample, not the whole market. Historical availability and credits depend on the account plan, so the app applies an authenticated shared budget and reports unavailable history instead of fabricating values.

## Demo and evidence plan

Use [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md) for the walkthrough and recording outline. The demo should show the live data state, the Atlas universe/coverage, one asset's source receipt, a matched comparison, and a thesis baseline. Include a redacted code/response excerpt from the receipt. If a historical request is unavailable, show the explicit limitation state and do not claim a historical result.

## Submission checklist

- [x] Public GitHub repository: NomadDigita/CMC-Lens.
- [x] Production deployment: [cmc-lens.vercel.app](https://cmc-lens.vercel.app/).
- [x] CMC endpoints named in this document and in the API data plan.
- [x] Live production call and redacted endpoint/status/count evidence checked on November 19.
- [x] CMC API usefulness and observed limitations documented.
- [ ] Confirm event registration and CMC account-email match.
- [ ] Select Data and Visualisation in the DoraHacks submission.
- [ ] Record and publish the demo video.
- [ ] Create the public DoraHacks BUIDL submission and verify its live page.
- [ ] Publish an X post linking the BUIDL page and video with #BuildwithCMC.
- [ ] Paste the X post URL into DoraHacks and verify the final public submission.

**Registration note:** Account-specific registration/submission state has not been verified. A previous DoraHacks browser attempt was blocked by human verification, so no form was completed from that session.