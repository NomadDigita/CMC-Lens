# CMC Lens UI/UX Redesign Plan

**Status:** In progress  
**Scope:** Product interface, design system, account connection, responsive behavior, and public project presentation  
**Reference review:** November 19, 2026

## Product experience to build

CMC Lens should feel like a precise market research instrument: calm enough for long sessions, expressive enough to make relationships visible, and honest about the evidence underneath each observation. Its defining interaction is a research loop:

1. Notice a move in the market context.
2. Find the assets and peers moving with or against it.
3. inspect the underlying CMC data and source receipt.
4. Save a thesis with a baseline.
5. Return later and review the same question against new observations.

The interface should make that loop obvious without suggesting a prediction or trade instruction. Dark and light are the only themes. They must share the same information hierarchy and chart semantics.

## Visual direction

Use the product's market-field metaphor as an organizing idea, not as decoration. Keep the existing graphite and citron identity, expand it with restrained cold blue and warm amber for separate chart states, and reserve the strongest citron for one primary action or a meaningful positive signal. Light mode should use paper-white surfaces with ink-colored text and chart accents that keep their meaning.

Typography should establish a clear rhythm: large editorial page titles, readable body copy, and compact data labels only where they improve scanning. Reduce the number of all-caps labels and avoid putting every piece of information in a rounded card. Prefer open chart surfaces, a few important panels, and subtle boundaries.

Motion must explain a change: the first paint of a data visualization, a selected asset, a view transition, or a save confirmation. All movement must stop or become minimal when reduced motion is requested. No background shader should obscure numbers, consume mobile battery, or masquerade as live data.

## Reference principles we are applying

| Reference | Principle applied to CMC Lens |
| --- | --- |
| Scrolltide | Use a deliberate opening rhythm and clear visual chapters; avoid adding scroll tricks to a dense research desk. |
| Snapblocks | Treat search, selection, compare, filter, thesis, dialog, and empty states as reusable components with complete states. |
| Scrollshaders | Draw ambient texture in CSS/SVG only where it helps orient the user; no autoplay video backgrounds or heavy WebGL dependency. |
| UIZZE, Taste Skill, Impeccable, Hallmark, Anthropic Frontend Design | Choose an art direction specific to market research; remove generic metric-card repetition; review the rendered UI and its empty, loading, error, hover, focus, and selected states. |
| Emil Design Engineering and Make Interfaces Feel Better | Spend polish on timing, focus, optical alignment, legible numerals, and touch feedback; do not animate every element. |
| Vercel Web Interface Guidelines and UI/UX Pro Max | Keep structure responsive, accessible, contrast-aware, and consistent across the desktop, tablet, and phone layouts. |
| Stageshow | Use deliberate product demonstrations and clear focus when presenting a UI; do not make fake values look like live data. |
| Tidelight README | Lead with a recognizable product mark, one clear product thesis, a real-looking product visual, and direct links to the live app and technical docs. |

We will borrow principles, not copy components or effects from the references.

## Screen-by-screen plan

### Market Pulse
- Make the primary question and the state of the data visible before the supporting metrics.
- Keep global context, market breadth, sentiment, and category movement distinct; show source time, coverage denominator, and demo/live state alongside them.
- Use the category chart as the hero evidence surface, with readable value labels and honest missing/low-coverage states.
- Keep “Start a thesis” available as the main follow-up action.

### Explore
- Put asset search first and keep name, ticker, CMC ID, price, 24-hour move, and quote time scannable.
- Support a useful first-run state and a clear no-results explanation.
- Preserve source attribution and one-click access to asset details.

### Compare
- Make the selected cohort and shared time window unmistakable.
- Keep assets and colors stable through sorting and selection; never interpolate absent historical data.
- Explain the exact period and coverage beside the plot, with a small-screen accessible table path.

### Market Atlas
- Introduce what each axis, bubble size, category, and peer comparison means without requiring trial and error.
- Keep the chart and accessible list synchronized.
- Label the top-100 scope and treat thin or missing categories as unknown instead of giving them a fabricated peer score.

### RWA desk
- Pair every issuer comparison with a clear next step: save the current CMC evidence as a thesis.
- Keep tokenized averages distinct from underlying share and commodity prices.
- In follow-up reviews, show the frozen issuer set beside the fresh one, preserve missing quotes, and label changed coverage so a missing token cannot look like a zero-price move.

### Thesis log
- Distinguish original view, baseline data, and later review in both the card and detail.
- Make open, ready-to-review, and reviewed states obvious; support empty and account-switch states.
- Keep attribution attached to CMC observations, not to the user's own notes.

### Settings and account
- Keep dark and light theme choices explicit and immediately reflected across every view.
- Explain local-only and cloud-synced storage in plain language.
- Offer Google OAuth and email one-time-code sign-in as equal entry points. Let the user choose whether guest research is imported before it is sent to the account.
- Confirm the Supabase Google provider, Google OAuth client, production callback URLs, and preview callback behavior before representing Google login as operational.

## Account connection

The client uses Supabase Auth directly with its publishable key. Google OAuth must request only the standard identity needed to bind a private workspace; the CMC API key remains server-side. Email sign-in stays passwordless. On OAuth return, exchange or validate the provider session, fetch the Supabase user, activate the per-user workspace, and run the same guest-import choice as email sign-in.

Auth acceptance requires: cancelled sign-in leaves the local workspace untouched; successful Google and email sessions share the same workspace; refresh retains the correct account; sign-out restores guest records; an account change never applies another user's in-flight sync.

## Implementation and review sequence

1. **Foundation pass (this pull request):** improve the Market Pulse hierarchy, tune the dark/light surfaces and visual rhythm, add the Google entry path beside email code, redesign the README opening, and record remaining provider configuration.
2. **Screen pass:** review Explore, Compare, Market Atlas, Thesis log, and Settings at 1440, 1024, 768, and 390 CSS pixels; fix overflow, scan order, empty/loading/error states, and keyboard focus.
3. **Interaction pass:** refine search, keyboard shortcuts, filters, selection, dialogs, saved thesis/review affordances, and unsaved local data messaging.
4. **Account pass:** configure and verify Supabase Google OAuth and its redirect allow-list after the OAuth client is available; exercise sign-in, cancellation, guest import, account switching, refresh, and sign-out.
5. **Release pass:** verify dark and light themes, keyboard-only operation, reduced-motion behavior, responsive layout, production source attribution, no leaked keys, and README links.

## Current implementation record

- [x] Two themes remain: dark and light.
- [x] Market Pulse page title and interaction polish updated.
- [x] Sign-in dialog offers Google OAuth and email code.
- [x] README gets a centered product introduction and an original product illustration.
- [x] Explore first-run search, one-click starters, and a recoverable no-results state (PR #44; preview reviewed at desktop width).
- [x] Compare shared date axis and baseline, stable asset colors, explicit expected-quote coverage, missing-data gaps, and an accessible plotted-values table (PR #45; preview reviewed in dark and light themes).
- [x] Market Atlas search by asset name, ticker, or CMC ID; search stays in sync across the map and accessible list (PR #47; exact numeric CMC ID matching in PR #48; preview reviewed with matching, no-match, and exact-ID queries).
- [ ] Responsive review of Explore, Compare, Market Atlas, Thesis log, and Settings at 1440, 1024, 768, and 390 CSS pixels; Explore, Compare, Market Atlas, and Thesis log were reviewed near 779 CSS pixels after PR #49. Market Pulse, Compare, Market Atlas, and RWA desk were also reviewed around 454 CSS pixels; Settings was checked around 341 CSS pixels, including the scrolled drawer and route. Exact target widths and phone-width Explore/Thesis captures remain outstanding.
- [ ] Supabase Google provider and Google OAuth callback allow-list configured and verified.
- [ ] Browser review of OAuth cancellation, successful account sync, guest import, and sign-out.
