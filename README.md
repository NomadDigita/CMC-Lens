# CMC Lens

**Turn a market move into a research record you can check later.**

CMC Lens is an evidence-first crypto research workbench. It combines CMC market context, category-relative discovery, matched asset comparisons, and dated thesis reviews so a researcher can preserve what they saw and revisit it without rewriting the original evidence.

**Live app:** [cmc-lens.vercel.app](https://cmc-lens.vercel.app/) · **Hackathon track:** Data and Visualisation (recommended; DoraHacks selection is not yet confirmed)

## Why it exists

A price chart shows what happened. CMC Lens helps a researcher record which assets and metrics informed a view, what would change that view, and what the same evidence looks like later. It keeps source facts, derived calculations, and user-authored reasoning distinct. It does not issue buy/sell instructions or claim to predict prices.

## Shipped product

- **Market Pulse:** live global context, breadth, category movement, and optional Fear & Greed context, with demo mode clearly labeled when live data is unavailable.
- **Market Atlas:** a top-100-by-market-cap sample plotted by 24-hour asset return and relative return versus covered category peers. Filters include category, market-cap band, and stablecoins; a keyboard-accessible list is available alongside the map.
- **Asset research:** search by asset name, symbol, or CMC ID, then inspect a current quote and its timestamps.
- **Matched comparisons:** compare selected CMC IDs over a shared period and carry the exact cohort into a thesis.
- **Thesis log and reviews:** preserve a baseline and append dated reviews without replacing the original snapshot.
- **Source receipts:** inspect named CMC endpoints, safe query parameters, upstream outcome, cache state, timestamps, record count, and a normalized response summary. Keys and raw upstream payloads are excluded.

See [docs/PRODUCT_BLUEPRINT.md](docs/PRODUCT_BLUEPRINT.md) for the product, UX, architecture, database, security, and delivery plan. See [docs/API_DATA_PLAN.md](docs/API_DATA_PLAN.md) for data contracts, endpoint use, history budgets, and credential handling.

## Live CMC endpoints

CMC requests run in the server-side adapter at api/market.js; CMC_PRO_API_KEY is never sent to browser code.

| Endpoint | Use |
| --- | --- |
| /v1/global-metrics/quotes/latest | Global market-cap and BTC-dominance context |
| /v3/fear-and-greed/latest | Optional sentiment context |
| /v3/cryptocurrency/listings/latest | Top-100 listings, quote coverage, and tag metadata for the Atlas |
| /v1/cryptocurrency/map | Resolve searched assets to stable CMC IDs |
| /v3/cryptocurrency/quotes/latest | Current asset snapshots and thesis reviews |
| /v3/cryptocurrency/quotes/historical | Historical comparison and matched-window replay, subject to CMC entitlement |

The production /api/market response exposes redacted source receipts. The latest verified production response returned live mode, 100 queried and covered listings, and successful HTTP 200 receipts for global metrics, Fear & Greed, and listings. Coverage is time-specific and can change; the UI labels the sample and missing values.

## Run locally

Prerequisites: Node.js and the Vercel CLI (or use npx vercel dev).

1. Clone this public repository.
2. Copy .env.example to .env.local.
3. Add the CMC key and Supabase URL/publishable key to that local file when you need live data and account sync. A CMC key is optional for the clearly labeled demo experience.
4. Run npx vercel dev from the repository root.

Never commit .env.local, paste an API key into the browser, or include credentials in screenshots or issue text. For database changes, apply the ordered SQL migrations in supabase/migrations to your own Supabase project.

## Hackathon readiness

The current event, submission checklist, verified live API evidence, honest limitations, and remaining submission steps are tracked in [docs/CMC_HACKATHON_READINESS.md](docs/CMC_HACKATHON_READINESS.md). A practical recording sequence is in [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md).

## Data, privacy, and safety

- Every CMC data view includes CMC attribution.
- The Atlas is a top-100 sample, not the entire market; peer means are descriptive and equal-weighted.
- Missing quotes and missing category peer samples remain missing.
- Signed-in research is scoped to the authenticated Supabase user; guest drafts remain local.
- API credentials remain server-side.
- CMC Lens is for research and education, not financial, investment, tax, or legal advice.
