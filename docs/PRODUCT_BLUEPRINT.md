# CMC Lens — Product and Engineering Blueprint

**Status:** Approved project direction, planning baseline  
**Working product name:** CMC Lens  
**Product category:** Evidence-first crypto research and thesis review  
**Primary data source:** CoinMarketCap API  
**Hosting target:** Vercel  
**Persistence and identity:** Supabase, introduced only for data that benefits from account-backed persistence  
**Themes:** Dark and light only

## 1. Product summary

CMC Lens is a market thesis workbench. It helps a person who notices a crypto market move explain what changed, compare that move with useful context, write down a testable view, preserve the supporting and conflicting evidence, and later review what actually happened.

The central product object is a **dated thesis record**, rather than a price tile. A record includes the user's question or hypothesis, a baseline, a review horizon, relevant assets or market benchmarks, source metrics and timestamps, the user's explanation, and any conditions that would strengthen or weaken the view. Later reviews are appended as new dated observations; they never rewrite the original evidence.

The product is useful because research is often scattered across charts, notes, screenshots, and memory. That makes it difficult to distinguish a view that was well supported at the time from a convincing story assembled after the event. CMC Lens makes that process inspectable and revisitable.

## 2. Problem and opportunity

CoinMarketCap and other market products already provide asset pages, prices, charts, watchlists, market comparisons, and AI-assisted features. Reproducing those as the main product would give CMC Lens little reason to exist.

The gap we will address is the **research loop around a market decision**:

- A user sees a move but lacks a quick, structured way to place it in market context.
- A comparison may use mismatched time ranges, peers, or baselines.
- Research notes often fail to preserve the data and timestamp that informed the original view.
- When the user checks again later, hindsight can change how the earlier rationale is remembered.
- Beginners may see numbers without understanding what they mean, what they omit, or how strongly they support a conclusion.

CMC Lens proposes to solve this by linking observations, calculations, user-authored reasoning, and later outcomes into a chronological evidence trail.

## 3. Users and use cases

### Primary user

An independent retail researcher or crypto beginner who notices a change in an asset or the broader market and wants to investigate it with context before forming or revisiting a view.

### Core jobs to be done

1. **Investigate:** “What changed, and how unusual is it relative to the market and relevant peers?”
2. **Compare:** “Are these assets moving together, or is one behaving differently over the same period?”
3. **Record:** “What do I believe, what evidence supports it, and what would make me change my mind?”
4. **Review:** “What happened after I recorded the view, and how does that compare with my original reasoning?”
5. **Learn:** “What does this market metric measure, and what limitations should I keep in mind?”

### Example use cases

- A user sees that an asset moved sharply and checks whether its peers and the broad market moved similarly.
- A user records a hypothesis that a token is outperforming its category, stores a matched-period comparison, and schedules a review date.
- A user logs a bearish or bullish question without turning it into a trade instruction, including what observation would invalidate it.
- A user revisits a thesis and sees the original metric values beside later values and the selected benchmark.
- A user shares a read-only research capsule containing a thesis, source timestamps, and methodology, without exposing private workspace notes.

## 4. Product promise and differentiation

**Promise:** “Turn a market move into a research record you can check later.”

The defensible product wedge is the combination of:

- Evidence with provenance: source, observed time, selected period, and calculation are visible.
- Matched comparisons: asset, peer group, and market context use the same baseline and period.
- A persistent thesis history: new evidence is appended, while the original record remains intact.
- A retrospective review: later observations are compared with the original conditions to reduce hindsight bias.
- Matched-window replay: the same saved CMC IDs are queried from the original comparison timestamp through the review timestamp, then displayed as indexed daily quote paths with visible missing intervals.
- Beginner-readable interpretation: short explanations and caveats accompany market data without pretending to predict prices.

The product will not compete on the number of indicators, an opaque “AI score,” portfolio tracking, or automatic buy/sell recommendations.

## 5. Scope and release definition

### MVP (hackathon release)

1. **Market Pulse**
   - Broad market context from available CMC global metrics.
   - Market breadth and category/peer movement where the account's API plan permits.
   - A ranked “investigate” queue based on explicit, explainable rules.
   - Each observation links to the input metrics and a plain-language method note.

2. **Asset dossier**
   - Search by name, symbol, or CMC ID.
   - Current market snapshot, recent history when available, and basic project metadata.
   - Clear timestamps, coverage labels, and CMC attribution.

3. **Matched peer comparison**
   - Compare a small number of assets using the same time window.
   - Show absolute performance alongside relative performance against a selected benchmark.
   - State what the comparison can and cannot support.
   - Freeze the selected CMC IDs, prices, and comparison timestamp so later reviews can query the same cohort.

4. **Thesis records**
   - Create a question or thesis with a baseline, affected assets/benchmarks, rationale, and review horizon.
   - Attach selected CMC evidence and the exact values available at creation.
   - Record supporting and conflicting evidence separately.
   - Store user-defined conditions that would strengthen, weaken, or invalidate the view.

5. **Review timeline**
   - Append dated snapshots and user review notes.
   - Compare the current observation with the original baseline and chosen benchmark.
   - Replay the exact baseline-to-review window for each saved CMC ID with normalized paths indexed to 100 at the saved price.
   - Show expected versus returned daily samples and missing periods; never interpolate missing CMC observations.
   - Keep original evidence immutable and show any data corrections explicitly.

6. **Demo path**
   - A usable sample workspace and labelled sample records if a live API secret, API plan, or login is not configured.
   - Sample data must be visibly marked as a demo. It must never be presented as live CMC data.

### Later releases

- Shareable, verifiable research capsules with deliberate privacy controls.
- Team workspaces and collaborative thesis reviews.
- Optional external sources (news, social, on-chain) only after source quality, licensing, and data provenance are established.
- Notifications based on user-defined research conditions, with freshness and delivery controls.
- More advanced calibration statistics once there is sufficient opt-in, privacy-safe history.

### Explicit non-goals

- Broker, exchange, wallet, or trading execution.
- Buy/sell/hold calls, profit promises, or personalized investment advice.
- Portfolio custody or transaction signing.
- A generic chat box that hides the underlying evidence.
- Unverified social sentiment, scraped content, or fabricated news explanations.
- A portfolio tracker or another general-purpose price-alert product in the MVP.

## 6. User experience and frontend

### Information architecture

- **Pulse:** what changed in the market and why it may be worth investigating.
- **Explore:** search and inspect an asset dossier.
- **Compare:** examine matched periods and benchmarks.
- **Theses:** list and filter open, due, reviewed, and archived research records.
- **Thesis detail:** original question, frozen evidence, conditions, timeline, and appended reviews.
- **Settings:** theme, account, and privacy controls.

### Design direction

The interface should feel like a specialist research instrument: legible, deliberate, data-dense where useful, and calm when explaining uncertainty. Layout, typography, chart semantics, spacing, and empty states will be designed around the research flow instead of a generic dashboard template.

Dark and light themes are the only themes. Both use semantic tokens and must pass contrast checks. Theme preference is stored locally or in the user's profile after auth is introduced.

Motion is reserved for state transitions, chart interaction, and meaningful change. It must honor `prefers-reduced-motion`, pause when hidden when appropriate, and remain optional. Shader or 3D effects are not part of the core analytical interface; a restrained ambient treatment may be considered only if it improves orientation and leaves charts and controls clear.

Responsive layouts must preserve the full workflow on mobile. Tables become focused cards or horizontal comparison views. Touch controls must have usable targets. No interaction should depend on color alone.

### UX requirements

- Search keyboard and screen-reader accessible.
- Loading, no-result, stale-data, API-limit, offline, and partial-coverage states are designed.
- Time zone and units are visible where relevant.
- Charts have text summaries and accessible labels.
- Explain derived values inline and provide a compact methodology view.
- Confirm destructive actions such as deleting a thesis; support recovery when feasible.
- Show privacy and sharing scope before a research capsule is made public.

## 7. System architecture

### Runtime components

1. **Web client on Vercel** — responsive research UI, client state, local demo records, and authenticated Supabase calls.
2. **Vercel serverless API adapter** — sends CMC requests server-side, normalizes responses, caches eligible reads, enforces safe parameters, and returns only needed fields.
3. **CoinMarketCap API** — market data source; endpoint access is verified against the event account's active tier before a feature depends on it.
4. **Supabase Auth** — user identity for persistent workspaces, if sign-in is enabled for the hackathon MVP.
5. **Supabase Postgres** — thesis records, dated snapshots, evidence references, review entries, preferences, and share capsules where justified.
6. **Vercel environment variables** — server-only CMC key and Supabase server secrets. No API key is returned to the browser or placed in Git.

### Request flow

1. The browser requests an application API route with validated asset/period parameters.
2. The server checks its response cache and rate limit.
3. On a cache miss, the server calls the relevant CMC endpoint with `X-CMC_PRO_API_KEY`.
4. The server checks response status, normalizes the fields, records observation time and source, and caches only where allowed.
5. The browser renders source data separately from derived metrics.
6. When a user saves a thesis, the browser writes through Supabase under the authenticated user's identity; Row Level Security enforces ownership.
7. A review creates a new immutable snapshot and review entry rather than overwriting the original.

### API route outline

- `GET /api/health` — non-secret health and configuration status; never reports secret values.
- `GET /api/pulse` — CMC global context and available breadth/rotation inputs.
- `GET /api/search?q=` — narrow asset lookup.
- `GET /api/assets/:id` — normalized asset overview.
- `GET /api/assets/:id/history?period=` — historical series when available.
- `GET /api/market?view=window-history&ids=&start=&end=` — one bounded, shared-date CMC quote history window for saved comparison IDs.
- `GET /api/categories` — category and peer context when plan access permits.
- `POST /api/capsules/:id/verify` — later release only; validates a signed or hashed public capsule.

API routes accept allow-listed query parameters, enforce response-size limits, apply per-IP/user throttles as needed, and return sanitized error codes without upstream secrets or raw headers.

## 8. Database model

All user-owned rows use UUID primary keys, `created_at`, `updated_at` where mutable, and RLS. Dates use UTC internally.

### `profiles`

- `id` — Supabase Auth user ID, primary key.
- `display_name` — optional user-selected label.
- `theme` — `dark` or `light`.
- `created_at`, `updated_at`.

### `theses`

- `id`, `owner_id`.
- `title`, `question`, `thesis_text`.
- `status` — `open`, `due`, `reviewed`, `archived`.
- `horizon_start`, `review_at`.
- `primary_asset_id`, optional `primary_asset_symbol` snapshot.
- `benchmark_id`, optional peer/category context.
- `baseline_snapshot_id`.
- `privacy` — `private` by default; public only through explicit capsule creation.
- `created_at`, `updated_at`.

### `thesis_snapshots`

- `id`, `owner_id`, `thesis_id`.
- `snapshot_kind` — `baseline`, `scheduled`, or `manual_review`.
- `source_provider`, `source_endpoint`, `source_observed_at`, `captured_at`.
- `period_start`, `period_end`, `currency`, `method_version`.
- `source_payload` — minimized, validated JSON of the values needed to reproduce the view.
- `derived_metrics` — calculation inputs and outputs, separate from source values.
- `coverage`, `freshness`, `limitations`.
- Unique/append-only behavior prevents mutation of the initial baseline.

### `evidence_items`

- `id`, `owner_id`, `thesis_id`, optional `snapshot_id`.
- `kind` — metric, observation, supporting, conflicting, or note.
- `label`, `detail`, `source_url`, `source_timestamp`.
- `value`, `unit`, `direction` when applicable.
- `created_at`.

### `thesis_conditions`

- `id`, `owner_id`, `thesis_id`.
- `condition_type`, `metric_key`, `operator`, `threshold`, `unit`.
- `effect` — strengthen, weaken, or invalidate.
- `active`, `created_at`, `updated_at`.

### `thesis_reviews`

- `id`, `owner_id`, `thesis_id`, `snapshot_id`.
- `reviewed_at`, `summary`, `result_label` (user selected, never model verdict).
- `notes`, `created_at`.

### `share_capsules` (later)

- `id`, `owner_id`, `thesis_id`.
- `public_id`, `snapshot_hash`, `expires_at`, `revoked_at`, `created_at`.
- Public resolver returns only the deliberately shared projection, never owner notes or private profile data.

### Indexes and RLS

- Index all user-owned tables by `(owner_id, created_at)` and child tables by `(thesis_id, captured_at)`.
- RLS `SELECT/INSERT/UPDATE/DELETE` requires `auth.uid() = owner_id`.
- `profiles.id = auth.uid()`.
- Public capsule access uses a narrow security-definer RPC/view and must not expose base tables.
- Service-role key stays server-side. The frontend uses the publishable/anon key and user JWT only.

## 9. CMC API and data integrity plan

Initial candidates are CMC latest listings, latest quotes, historical quotes, global metrics, trending, and categories. Each endpoint is conditional on current account-tier access. The first release should prefer an accessible smaller evidence set over making a blocked feature a dependency.

For every displayed source metric, preserve endpoint, asset/market identifiers, unit/quote currency, period, source timestamp, retrieval timestamp, and relevant coverage. Derived calculations include a versioned method label and their inputs. Missing or stale data is explicit.

CMC attribution will read **“Data provided by CoinMarketCap.com”** and link to CoinMarketCap. We will capture one real API request/response proof for the hackathon while redacting the key and any account identifiers. The API feedback note will describe strengths and limits observed during actual use.

### API cost and reliability controls

- Cache repeated public reads according to CMC terms and the intended freshness of each metric.
- Avoid polling per user; fan-in through server cache.
- Request only fields and result counts needed by a screen.
- Add timeout, bounded retry with backoff, and clear degraded-mode responses.
- Track cache hits, upstream errors, request counts, and remaining quota if CMC exposes it, without logging secrets.
- Handle CMC `429`, entitlement failures, malformed payloads, and upstream downtime distinctly.
- Provide a clearly labelled demo dataset when no key is configured; never silently fall back from live to sample data.

## 10. Security, privacy, and abuse resistance

- CMC key remains server-only in Vercel secrets; never in source, client JS, browser local storage, logs, screenshots, or public issue text.
- Supabase publishable key is public by design; Supabase service-role key is never sent to the browser.
- RLS is required before persistent user features ship.
- Validate all parameters, sanitize rendered content, and use safe output encoding.
- Use same-origin API requests, content security policy where compatible, and secure headers.
- Rate-limit search and upstream routes; cache safe GET requests to protect quota.
- Keep private thesis notes private by default. Public sharing is opt-in, scoped, revocable, and versioned.
- No execution, custody, private-wallet data, or transaction signing.
- Disclose that analysis is informational and may be incomplete or stale.

## 11. Accessibility and quality bar

- Keyboard-only completion of core research flows.
- Semantic landmarks, labels, focus visibility, and correct heading order.
- WCAG AA contrast targets in both themes.
- Reduced-motion support and non-color chart encoding.
- Mobile layout checks at narrow phone, large phone, tablet, laptop, and wide desktop widths.
- Empty, loading, error, stale, partial, and demo states are tested.
- Functional checks cover search, asset detail, compare, thesis creation, snapshot preservation, review append, theme persistence, and access restrictions.
- No placeholder CTA or inert control in a submitted build.

## 12. Delivery plan, step by step

### Phase 0 — Foundation and plan

- Create this product blueprint and API/data plan.
- Establish a public repo build path, initial UI foundation, and Vercel connection.
- Verify hackathon dates, selected track, API account tier, endpoints, attribution, and submission checklist.

### Phase 1 — Distinctive frontend prototype

- Implement semantic dark/light tokens and responsive app shell.
- Build Market Pulse, Asset Dossier, Compare, Thesis list/detail, and review flow using clearly labelled demo data.
- Ensure each important number has source/method/freshness context.
- Validate the complete interaction path before adding more decoration.

### Phase 2 — CMC server integration

- Implement server-only CMC adapter and health/config status.
- Verify enabled endpoints and quotas from the registered hackathon account.
- Integrate one endpoint at a time, normalize payloads, and record visible source timestamps.
- Add cache, throttling, timeout, backoff, and degraded mode.
- Capture redacted proof of actual API use.

### Phase 3 — Persistence and identity

- Create an isolated Supabase project only after organization and cost are confirmed by the platform workflow.
- Apply versioned migrations and generate database types.
- Configure Auth only if it materially improves the hackathon workflow.
- Enforce RLS and test that a user cannot read another user's theses or snapshots.
- Keep anonymous demo usable without persistent storage.

### Phase 4 — Thesis intelligence and review

- Persist baseline evidence and immutable snapshot semantics.
- Implement user-defined conditions and review due states.
- Append reviews and outcome snapshots with clear benchmarks.
- Add transparent explanations generated from explicit rules; do not present them as a forecasting model.

### Phase 5 — Stabilize and polish

- Check all pages in dark and light, desktop and mobile.
- Review accessibility, browser errors, performance, loading/error states, and CMC attribution.
- Remove any dead controls and fabricated live claims.
- Run code-quality, security, build, and interaction verification before PR merge.

### Phase 6 — Hackathon packaging and submission

- Select the best-fit track, expected to be **Data and Visualisation**, subject to DoraHacks track details.
- Ensure the repo is public and contains setup instructions, architecture/data decisions, and exact CMC endpoint names.
- Deploy a working demo or prepare an approved screen recording.
- Include redacted proof of a real CMC API call, API feedback note, and visible CMC attribution.
- Prepare the X post with the DoraHacks submission/demo links and `#BuildwithCMC`.
- Submit by the verified deadline and check the final submission page state.

## 13. Risks and decisions

| Risk | Response |
|---|---|
| CMC plan does not allow a candidate endpoint | Make access conditional, use a smaller valid endpoint set, and label unavailable coverage. |
| User mistakes an observation for a prediction | Keep methods visible, use neutral language, and exclude buy/sell recommendations. |
| API quota is consumed by dashboards polling | Cache and coalesce requests server-side; request the smallest payloads. |
| Users alter the original thesis after seeing the result | Preserve immutable baseline snapshots and append dated reviews. |
| A public capsule exposes private notes | Default private; share a narrow projection; support expiry and revocation. |
| The experience looks like a generic AI market dashboard | Make the thesis/evidence/review loop the primary navigation and visual hierarchy. |
| Rich effects hurt legibility or mobile performance | Use them only when they help explain state, and honor reduced motion. |

## 14. Success measures

### Hackathon readiness

- A judge can start from the deployed app and complete a research record without a forced sign-in.
- A real CMC response is visibly attributable and its endpoint is documented.
- A record can be revisited with its original baseline intact and a later observation appended.
- The UI supports both themes and mobile layouts with no blocking broken controls.

### Product usefulness

- Time from opening Pulse to saving a sourced thesis.
- Share of thesis records with at least one supporting and one conflicting evidence item.
- Review completion rate and proportion of reviews using the original baseline.
- User-reported clarity of metric, method, timestamp, and coverage.
- API cache-hit ratio and quota cost per completed research session.

## 15. Current known state

**Checked: November 18, 2026**

- Repository: `NomadDigita/CMC-Lens`; the product is deployed at [https://cmc-lens.vercel.app](https://cmc-lens.vercel.app).
- Hosting: a dedicated Vercel project named `cmc-lens` is linked to this repository. The production deployment receives changes from `main`.
- Database and identity: a separate Supabase project was created in the MigrateOS organization. The existing Tidelight project is not reused. Private research tables use row-level security.
- CMC credentials: `CMC_PRO_API_KEY` is configured server-side in Vercel Production and is not stored in source control or sent to the browser.
- Current sign-in: Supabase email one-time-code and magic-link sign-in. Google OAuth is not configured.
- Market Pulse uses live CMC global metrics and a top-100 listing when the production API is available; otherwise the interface switches to a clearly labeled eight-asset illustrative demo sample. The live overview and asset search carry per-asset quote timestamps. Breadth states its advancing count and denominator.
- Explore searches CoinMarketCap's active asset map and requests current quotes. Compare lets users search loaded or remote assets, select up to four, and requests matched historical quote series for 7D, 30D, or 90D.
- Thesis records preserve a baseline, source timestamp, evidence items, user-defined conditions, and append-only reviews. Reviews compare the original baseline with the latest quote when CMC access is available. CMC Lens does not generate buy/sell instructions or a predictive score.
- Signed-in thesis caches are scoped by Supabase user ID. On first connection, a user can explicitly import guest drafts into their private workspace or keep them local. Signing out returns to guest drafts rather than another account's cache.
- The interface supports dark and light themes. Sentiment remains unavailable in live mode until a source is integrated and verified; demo sentiment is labeled as illustrative.
- Still planned: richer source citations and evidence collection, account-management and recovery UX, optional public/shareable research capsules with explicit privacy controls, and hackathon packaging/submission. Do not represent these items as implemented until shipped and verified.

## 16. Verified hackathon submission requirements

The CoinMarketCap API hackathon is scheduled for **November 18 through December 9, 2026**, closing at **23:59 UTC on December 9**. The selected primary track is **Data and Visualisation**, because the strongest project contribution is a reproducible research view with evidence, matched comparisons, and dated review. The project can mention market tools, but its primary submission story should remain the research workflow.

The submission checklist is:

- Public GitHub repository with clear setup and endpoint documentation.
- Working deployed demo, or a short screen recording if the live demo cannot be accessed.
- One primary track selected in DoraHacks.
- Named CMC endpoints documented in the submission.
- Visible, redacted proof of at least one real CMC API request and response.
- A short API feedback note based on actual integration.
- X post linking the DoraHacks submission and demo, using `#BuildwithCMC`.
- Complete the submission before the verified close. In Nigeria the deadline is December 10, 2026 at 00:59 WAT.

Hackathon evaluation categories are functionality (30), usefulness (25), interesting API use (20), code quality and documentation (15), and presentation (10). The product plan maps to these through a complete working thesis flow, an explainable use case, multiple CMC-backed contextual endpoints, this blueprint and API documentation, and a polished demo narrative. Track-specific weighting should be rechecked on DoraHacks before final submission.

The event page indicates participant access to the CMC Startup API tier for the event period, subject to the event account match. The matched-window replay remains best-effort: it shows point-in-time comparison results even when CMC historical access is unavailable. The Startup plan currently covers the initial global-metrics, latest-listings, latest-quotes, asset-map, and historical-quotes endpoints selected here. We must still verify the participant's live key and actual endpoint entitlement from a real request before calling any production data live. The API key stays private; API credit usage and historical request counts are monitored.
