# CMC API Hackathon Readiness

## Event and track

**Event:** Build with CMC: API Hackathon, Round 2  
**Recommended track:** Data and Visualisation  
**Submission window:** 18 November–9 December 2026, 23:59 UTC  
**Project:** CMC Lens — a market research workspace that makes asset comparisons reviewable over time.

CMC Lens is a pre-existing codebase only if its CMC integration and this hackathon-specific work are clearly identified. This round's new work combines a Market Atlas over CMC's top-100 market-cap sample with comparison evidence replay. The Atlas groups each asset into one deterministic primary CMC tag category and plots absolute 24-hour return against category-relative return, while showing missing coverage and source provenance. The matched-window view requests the same saved baseline and review timestamps for every CMC ID, indexes returned daily quotes to 100 at each frozen baseline, and makes missing intervals visible. The original snapshot stays immutable; missing quotes remain missing.

## What a participant must submit

The official CMC event page requires:

- A **public GitHub repository**.
- A working deployed demo or a screen recording.
- One selected track.
- The CMC endpoints used, named explicitly.
- Visible proof of a real API request and response.
- A short note on what the API made possible and where it got in the way.
- A public X post linking the DoraHacks submission and demo video, with `#BuildwithCMC`; its URL goes in the submission form.

Do not mark the entry complete until each item is checked and the DoraHacks BUIDL submission is publicly visible.

## Product value and use

Crypto researchers often see a current price move without a way to preserve the comparison they were considering or to revisit the same assets later. CMC Lens records the question, primary asset, selected peers, period, captured quote values, data timestamps, coverage, and available history. A later review refreshes those exact CMC IDs and compares the new observations with the saved prices.

This is descriptive research workflow, not a price prediction or trading recommendation. The replay uses the primary asset as its benchmark and separately reports an equal-weight peer mean. It does not replace unavailable quotes with estimates.

## CMC API endpoints currently used

All requests are made server-side through `api/market.js`; the API key is read from `CMC_PRO_API_KEY` and must never be exposed in browser code, docs, screenshots, or Git history.

| CMC endpoint | Product use |
| --- | --- |
| `/v1/global-metrics/quotes/latest` | Total market cap and BTC dominance context |
| `/v3/cryptocurrency/listings/latest` | Broad market coverage, asset quotes and category tags |
| `/v3/fear-and-greed/latest` | Optional sentiment context, separately cached and failure-isolated |
| `/v1/cryptocurrency/map` | Search names, symbols and CMC IDs |
| `/v3/cryptocurrency/quotes/latest` | Asset dossiers and refresh of saved comparison IDs |
| `/v3/cryptocurrency/quotes/historical` | Historical price series for comparisons |

The internal route `/api/market?view=asset&id=<CMC_ID>` validates a numeric ID and returns a CMC asset only when the returned CMC ID matches the request. The API key stays on the server.

## In-product source receipts

The **Inspect the CMC source** panel is reachable from the dashboard's data-connection control. After live data loads, it displays the actual endpoint path, allowlisted query parameters, upstream HTTP outcome, application cache state, source-observed timestamp when supplied, CMC retrieval time, app-served time, record count, and a compact normalized response summary. The summary excludes raw responses, headers, and credentials. Demo mode says explicitly that it made no CMC request.

Receipts accompany overview, asset, search, historical-series, and thesis-review API responses. They are suitable for a demo walkthrough and for capturing a redacted request/response example. A receipt proves which configured server adapter call was made; it does not prove account registration or DoraHacks submission.

## Evidence and honest limitations

For a judge-ready demo, capture one comparison-backed thesis twice: first show the saved CMC IDs, quotes, and source timestamps; then show the dated replay and the exact returned quote values. Include the corresponding request and a redacted response excerpt. Never include a key or account credential.

Known constraints to disclose:

- The replay is only available when both the saved baseline and current quote are from CoinMarketCap.
- CMC quote endpoints may return incomplete coverage or unavailable fields; the UI preserves missing values.
- Historical endpoint access depends on the registered key's plan and event entitlement.
- The event requires API feedback. Record only observed problems such as unavailable fields, confusing documentation, or rate limits; do not invent issues.

## Submission checklist

- [ ] Confirm DoraHacks registration and CMC API event access.
- [ ] Confirm the CMC account email entered for registration matches the CMC account email.
- [ ] Confirm the GitHub repository is public and contains no secrets.
- [ ] Record a working demo or short screen recording showing a live CMC call.
- [ ] Include endpoint names and redacted request/response evidence.
- [ ] Complete the short API usefulness/limitations note from observed use.
- [ ] Select Data and Visualisation on DoraHacks.
- [ ] Publish the required X post with the DoraHacks BUIDL link, demo-video link, and `#BuildwithCMC`.
- [ ] Paste the X post URL into the DoraHacks submission form and verify the public BUIDL page.

**Account-specific registration/submission state is not confirmed in this document.** DoraHacks currently presented a human-verification check to the review browser, so no registration or submission form was accessed.
