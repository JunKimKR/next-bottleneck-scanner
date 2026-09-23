# NEXT BOTTLENECK SCANNER — architecture

## Design, before implementation
Node 22.13+ / native SQLite / dependency-free HTTP server / static browser UI.

SEC universe + company facts + submissions → immutable source cache → period-normalized metrics → evidence ledger → directed bottleneck graph → eligibility gates → score and coverage → change detection → daily report → browser snapshot.

Local app runs the persistent research engine. A hosted static copy displays the last exported snapshot; it never claims to run background collection. Local scheduler must remain running for daily updates. Watchlist in the hosted viewer is explicitly device-local.

## Data contracts
Every observation: value, unit, source URL, observed_at, period_end, kind (Reported / Calculated / Analyst), and inputs where calculated. Missing values remain null. Derived growth uses positive prior denominators; negative EPS baselines are not represented as misleading percentages. No sector multiples, China assessments, or backlog are invented.

SQLite tables: companies, evidence, documents, runs, snapshots, settings. Source payloads are cached under SHA256 URL keys with retrieval timestamps. Snapshots preserve full historical output. Analyses can be replayed from stored evidence and raw source files; current exports are not a point-in-time backtest dataset.

## Bottleneck inference
Editable directed graphs encode at least five nodes and four causal transitions, timing, scarcity mechanism, suppliers, counterarguments, invalidation criteria. Keyword evidence retrieves relevant graphs; this is transparent rule-based hypothesis generation, not proof of causality. New themes may be proposed from repeated document phrases; a researcher must validate their causal links. Evidence must be source-linked before it affects any score.

## Gates and scoring
US exchange universe, $3–15B primary / $2–20B secondary, explicit megacap blocklist, China HIGH exclusion, unknown China review exclusion. Market cap older than 7 days and China review older than 180 days cannot pass the core gate. Eight components total 100. Missing components earn zero and reduce coverage; no normalization up to 100. All six penalties are exposed separately. Score is withheld below 60% coverage. Research Priority additionally requires scored structural importance, company exposure, actual growth evidence, coverage >=75%, score >=65 and eligible universe.

## Source hierarchy and update
SEC first, official IR evidence second, market provider for prices and estimates. Yahoo chart → Alpha Vantage daily → provenance-bearing manual OHLCV. SEC requests are sequential, cached and retried with backoff, under 5 requests/second. Price corporate-action adjustments are required for technical scores; unadjusted fallback remains visible but cannot generate technical or price-divergence conclusions. Fiscal standalone quarters are used; YTD values are not treated as quarters. Q4 may be derived only from matching annual and 9-month durations.

## Security
HTTP binds to 127.0.0.1. Mutations require same-origin JSON requests; arbitrary URL fetching is not exposed. API keys remain server-side and are redacted from provider error records. Evidence text is rendered using HTML escaping; links permit HTTPS only. JSON body limit 1MB. Hosted publishing excludes local database and secrets.
