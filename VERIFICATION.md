# Verification record

Verified in this workspace on 2026-09-23.

- Korean is the default interface language with a white background.
- Node 24.19.0; no third-party npm dependencies.
- 17 automated tests passed: fiscal normalization, tag recency, restatements, missing/negative denominators, China HIGH exclusion, stale observations, megacap exclusion, short/unadjusted charts, keyword boundaries, evidence validation, backlog YoY, period alignment, new growth engines, fundamental weakening, HTML extraction and new-theme proposal.
- Successful live collection for 10 initial companies: SEC company facts, submissions, recent filings, Yahoo daily prices. A prior restricted-network run failed as expected and wrote explicit errors; a permitted network run completed with no provider failures.
- Each company has 500 returned daily price bars in the captured dataset. These are provider observations, not synthetic data.
- Latest available fiscal periods vary by company; the system does not assume that calendar date implies a particular quarterly filing exists.
- SEC tag mismatch discovered on real data and corrected: revenue IncludingAssessedTax is supported and newer tag periods take priority over stale Revenue/SalesRevenueNet tags.
- Browser checked: light theme, loaded terminal, company search, company detail, valid WebMCP navigation and rejection of an unknown ticker. Source-linked data and unreviewed China state displayed.
- Local HTTP snapshot returned 200 with all 10 companies.
- No forward-estimate API key was supplied. Forward valuation, verified China ratings, backlog and segment data remain missing unless separately supported by a reviewed observation.
- No investment thesis has been promoted solely because of a keyword mention. Initial companies remain research leads until eligibility and evidence gates pass.
- User explicitly authorized public Sites publication after the initial approval review. The public snapshot excludes .env, API keys and the local SQLite database. Deployment outcome is verified separately by the Sites status tool.

This verifies the implemented workflow, not the accuracy of every upstream filing or market-provider value. Review source-linked observations before using them in research decisions.
