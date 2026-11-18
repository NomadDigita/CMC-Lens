# CMC Lens — API and Data Plan

## API principles

- CoinMarketCap is the source of market facts; the user is the source of thesis language and review conclusions.
- Keep raw source facts distinct from derived values and narrative explanations.
- Record the selected asset ID, endpoint, period, quote currency, per-asset source timestamp, retrieval time, and method version.
- Never imply that a missing or inaccessible endpoint returned an empty market.
- Use a demo payload only when clearly marked and visibly different from live data.

## Candidate endpoint matrix

Endpoint access must be checked against the active CoinMarketCap event API tier before it becomes a product dependency.

| User need | Candidate CMC source | Initial use | Fallback |
|---|---|---|---|
| Broad market context | `/v1/global-metrics/quotes/latest` | Market capitalization and dominance context | Clearly label unavailable metrics; no fabricated replacement |
| Find an asset | `/v1/cryptocurrency/map` plus quotes latest by CMC ID | Name/symbol/CMC ID resolution | Local demo catalog in demo mode |
| Current asset facts | `/v3/cryptocurrency/listings/latest` and `/v3/cryptocurrency/quotes/latest` | Asset dossier and matched quote snapshot | Show cached timestamp and stale badge if permitted |
| Look back over a period | `/v3/cryptocurrency/quotes/historical` | Shared start/end window for the saved CMC IDs; index each returned daily quote to the frozen baseline | Select a supported window or show point-in-time replay with an explicit history-unavailable state |
| Category/peer context | Categories and category listings | Peer cohort and rotation exploration | User-selected peer set; state it is not an official category |
| Unusual activity discovery | Trending latest | Candidate queue entry point | Derive a small, explainable queue from accessible listings |
| Sentiment context | Fear and Greed endpoint, if enabled | Optional contextual metric only | Exclude it from a core thesis if unavailable |
| CMC AI or community signals | CMC AI Insights / community trending, if enabled | Potential future evidence source | Keep out of core MVP unless source and access are verified |

The MVP is designed so it can work with a small set of authorized endpoints. Data breadth is less important than a trustworthy evidence trail. A matched-window replay sends the saved IDs together and uses one shared baseline/review date range. It records per-asset daily point counts, displays missing intervals, and does not fill gaps. CMC currently documents daily history up to one year for the Basic tier; the application caps a requested window at 366 days and shows a point-in-time fallback if entitlement or coverage is unavailable. See the [official CMC historical quotes documentation](https://coinmarketcap.com/api/documentation/pro-api-reference/cryptocurrency) for plan and interval details. Historical replay requires a signed-in account. Before any upstream call, a Supabase Edge Function validates the session and reserves the estimated historical credits in a shared database budget (60 credits per account and 120 credits globally per rolling hour). The API coalesces requests with the same saved assets, baseline, and 10-minute review-time bucket for 10 minutes in a warm server instance; the shared database budget is the cross-instance control.

## Market Atlas data contract

The Atlas reuses the latest CMC listings response and adds no upstream market-data request. Its universe descriptor is explicitly `top-100-by-market-cap`, with queried, covered, and missing counts. Each asset includes one deterministic primary category, category peer coverage, peer mean 24-hour return, and relative return (asset return minus the mean of other covered assets in that category). If no covered peer sample exists, the relative return is `null`; market-mean context remains separately labeled. Missing metrics remain `null`, and the sample is never described as the whole market. The UI offers both the rotation map and a keyboard-accessible list/table view.

## Adapter contract

Each adapter method returns a normalized envelope:

```json
{
  "source": "coinmarketcap",
  "endpoint": "documented-endpoint-name",
  "retrievedAt": "ISO-8601 UTC",
  "sourceUpdatedAt": "ISO-8601 UTC or null",
  "quoteCurrency": "USD",
  "coverage": { "status": "complete|partial|stale|unavailable", "note": "..." },
  "data": {},
  "derived": { "methodVersion": "...", "values": {} }
}
```

`data` retains only the fields needed by the UI and thesis snapshots. `derived` contains calculations and method metadata and is never presented as a raw CMC field.

## Server-side key handling

- Read `CMC_PRO_API_KEY` only in server runtime.
- Send it only as the documented `X-CMC_PRO_API_KEY` header to CoinMarketCap's official API host.
- Do not send the key to browser code, logs, error messages, analytics, Supabase, or source control.
- Vercel configuration uses an encrypted server environment variable. Preview and production scope should be deliberate.
- Rotate or revoke an exposed key through CoinMarketCap, then update the server secret.
- `.env.example` contains only an empty variable name and safe non-secret examples.

## Cache and quota policy

Each route declares a cache duration that balances freshness with per-minute and credit limits. Browser polling is avoided in the MVP. The server shares cached GET responses where API terms allow. Cache metadata includes fetch time and content version. Rate-limit responses include a retry time when available. Bounded retries apply only to transient failures and never cause a request loop.

## Error taxonomy

- `CMC_NOT_CONFIGURED` — demo mode is available; no live claim is shown.
- `CMC_ENTITLEMENT` — this API tier does not expose the requested endpoint.
- `CMC_RATE_LIMITED` — respect retry timing and display last available data clearly.
- `CMC_UPSTREAM_UNAVAILABLE` — show cached values only if still permitted and label freshness.
- `CMC_INVALID_RESPONSE` — reject malformed data and surface a non-secret message.
- `INVALID_QUERY` — reject unsupported identifiers, periods, and result sizes before upstream call.

## Proof and attribution

For the hackathon, retain a redacted sample request/response showing the official endpoint and useful output fields. Remove API key, user identifiers, and any secret response headers. Show the required CMC attribution wherever CMC data is displayed and link to `https://coinmarketcap.com/`.
