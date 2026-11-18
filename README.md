# CMC Lens

**A market thesis workbench for evidence-led crypto research.** CMC Lens helps an independent researcher move from noticing a market change to recording a testable view, preserving the data behind it, and reviewing the outcome later.

CMC Lens is not another price dashboard or a buy/sell signal generator. Its core object is a **thesis record**: a question or hypothesis, the evidence available at the time, the conditions that would change the view, and a dated review of what happened next.

## Current status

Planning and first implementation are in progress. The repository began empty. See [`docs/PRODUCT_BLUEPRINT.md`](docs/PRODUCT_BLUEPRINT.md) for the product scope, users, workflows, architecture, data model, delivery sequence, and hackathon submission plan. See [`docs/API_DATA_PLAN.md`](docs/API_DATA_PLAN.md) for CMC endpoint strategy, attribution, caching, and API-key handling.

## Product loop

1. **Notice** a market move or change in market context.
2. **Investigate** the asset against the market and its peers.
3. **Record** a thesis with evidence, a baseline, and a review horizon.
4. **Revisit** the dated record and compare the observed result with the original view.

## Principles

- Show where a metric came from and when it was observed.
- Keep calculations inspectable and distinguish them from source data.
- Explain uncertainty and missing coverage in plain language.
- Give users a record of their own reasoning, without issuing investment advice.
- Make dark and light themes equally complete.
- Keep CMC credentials server-side and attribute CMC data visibly.

## Development

The first prototype is intentionally dependency-light so the research flow can be built and deployed quickly. The API adapter lives in `api/`; browser assets live in `public/`. Runtime secrets are supplied through deployment environment variables and are never committed to the repository.

## Data attribution

When CoinMarketCap data is displayed, the product will show **“Data provided by CoinMarketCap.com”** with a link to CoinMarketCap, subject to the applicable API terms.

## Disclaimer

CMC Lens is for research and education. It does not provide financial, investment, tax, or legal advice, and it does not recommend buying or selling an asset.
