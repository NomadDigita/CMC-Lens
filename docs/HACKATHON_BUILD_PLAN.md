# Build with CMC: Round 2 delivery plan

**Project:** CMC Lens  
**Hackathon:** Build with CMC: API Hackathon, Round 2  
**Primary track:** Real World Assets  
**Supporting track fit:** Data and Visualisation  
**Status checked:** 20 November 2026

## Product direction

CMC Lens is an evidence-first market research workspace. The Round 2 feature is the **RWA Desk**: a live explorer for tokenized real-world assets that connects a stock, commodity, or other underlying to the token issuers and markets CMC tracks.

The problem is fragmentation. A person researching tokenized NVIDIA or gold has to find which instruments represent the underlying, compare issuers, then work out whether the displayed prices and liquidity are comparable. The RWA Desk brings that information together with the source and time visible.

The desk shows CMC's aggregate tokenized price, tokenized market capitalization and 24-hour volume, then opens the tracked instruments with issuer, price, market capitalization, and volume. It calculates each instrument's difference from CMC's tokenized average and labels that comparison precisely. This is **dispersion among CMC-tracked tokenized instruments**; it is not a redemption guarantee or a comparison against an independently sourced underlying quote.

## Round 2 rules and submission checklist

The official CMC announcement says the build window runs 18 November–9 December 2026, judging runs 10–25 December, and results are scheduled for 30 December. Entries may be solo or teams of up to four, with participants at least 18 and eligible worldwide, subject to the published shipping exclusions.

Required submission evidence:

- Public GitHub repository with a clear README.
- Working deployed demo or a short screen recording.
- One track selected.
- The CMC API endpoints used, named explicitly.
- Visible evidence of a real API call, including code and response.
- A note on what CMC API data made possible and where the API got in the way.
- An X post linking the DoraHacks submission and demo video with `#BuildwithCMC`, with its URL entered in the submission.

CMC says pre-existing projects are eligible only when the CMC integration is new and clearly identified. CMC Lens already had CMC integration before Round 2. The RWA Desk and its `/v5/real-world-assets/` integration are the new Round 2 work; submissions must disclose that distinction accurately. If the organizer interprets “new integration” more narrowly, ask through the hackathon Questions tab before final submission.

## Judging targets

CMC publishes a 100-point overall rubric:

| Criterion | Points | Product evidence to deliver |
| --- | ---: | --- |
| Does it work | 30 | Production RWA list and detail requests; tested loading, empty, error, and demo states. |
| Useful to a real person | 25 | Clear issuer, instrument, liquidity, timestamp, and dispersion context for tokenized asset research. |
| Interesting CMC API use | 20 | New RWA endpoints joined into a usable underlying → token → issuer view. |
| Code quality and documentation | 15 | Server-side key, input validation, caching, source receipts, documented endpoint paths, accessible controls. |
| Presentation | 10 | Clean responsive interface, CMC attribution, short demo, visible real API request and response. |

The current CMC Round 2 brief publishes the overall rubric above. The Real World Assets track is the strongest fit because the new work uses the RWA endpoints directly; the product still needs the specific track selected in the BUIDL form. Track-specific weights are not exposed in the public CMC brief and remain to be checked in the DoraHacks Tracks tab.

## New Round 2 CMC API integration

- `/v5/real-world-assets/assets/list`: page through underlyings and aggregate tokenized quotes.
- `/v5/real-world-assets/quotes/latest`: fetch tokens, token prices and liquidity, issuers, and linked TradFi markets for one underlying.
- `/v5/real-world-assets/info`: fetch company and asset metadata.

All calls run server-side using the existing `CMC_PRO_API_KEY`. Never place the key in browser code, screenshots, public logs, or Git history. Cache list and detail payloads to avoid repeated calls; expose endpoint and request receipts in the existing source-inspection workflow.

The RWA catalog requests up to 100 underlyings, then batches a metadata lookup to display CMC-hosted underlying logos. If that lookup fails, the catalog still renders with symbol fallbacks. Enriched catalog responses are cached for five minutes.
## Work sequence

1. **Production UI fixes:** render official CMC token logos with safe letter fallbacks; correct sentiment-label wrapping; make BTC dominance indicator follow the live value.
2. **RWA API service:** add list and detail routes with input validation, caching, source receipts, and clearly labelled demo data.
3. **RWA Desk:** build the searchable underlying-to-issuer explorer with CMC logo attribution, asset filters, coverage summaries, a fixed-scale dispersion rail, and phone layouts.
4. **Research memory:** snapshot RWA issuer and market-quality evidence in a dated thesis, then compare later reviews without rewriting the baseline.
5. **Evidence Watch extension:** add fresh, user-triggered checks for RWA price coverage, price dispersion, and issuer concentration. Partial prices or unattributed volume do not produce a confident result.
6. **Reliability:** test live and demo API shapes, missing metadata, failed logo images, partial issuer attribution, stale quotes, API limits, and empty token sets; preserve existing market, compare, and thesis flows.
7. **Submission proof:** update the README with the Round 2 feature boundary, document endpoint paths, capture a sanitized real request/response, record a short demo, and prepare the required X post and DoraHacks fields.

## Product boundaries

- CMC values are observations, not recommendations or forecasts.
- Tokenized market data does not establish legal ownership, redemption rights, or parity with an underlying asset.
- Demo values remain visibly identified and must never be presented as live.
- Select **Real World Assets** in the submission and check the DoraHacks Tracks tab for any track-specific weighting before final submission.
