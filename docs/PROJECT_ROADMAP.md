# VayuWise AI — Project Roadmap

This roadmap tracks phased implementation from Phase 00 (foundation) through full delivery of all 16 planned application modules.

## Phase Overview

| Phase | Title | Core Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 00** | Project Foundation & Architecture | Next.js TS strict setup, Tailwind v4 tokens, shadcn/ui base, typed service contracts, Zod env/schemas, Vitest + Playwright, Git, docs | Completed |
| **Phase 01 / 01.1** | Premium UI/UX & Design Transformation | Dark-first Obsidian Forest / Electric Mint design system, cinematic landing page, collapsible sidebar, semicircular AQI gauge, bento dashboard, 9 workspace routes, EN/HI base | Completed |
| **Phase 02** | Real Air Quality API, Location & Forecasting | Open-Meteo Air Quality & Geocoding routes, caching/resilience, global search & optional geolocation, 24h/48h forecast, subindex dominant pollutant, lower-exposure windows, rule-based guidance, Air Quality Insights, Gemini context builder | Completed |
| **Phase 03** | Gemini AI Routine, Indoor Coach & Chat | Server-side `@google/genai` integration, Zod-validated chat/plan/indoor/sustainability/community routes, safety layer, verified knowledge registry, 24-scenario eval suite | Completed (Live Verified in Phase 03.1) |
| **Phase 04** | Deterministic Impact, What-If & Budget Swaps | Versioned v2 profiles & migration, 6-step optional onboarding, personalization engine & priority scoring, CEA/India GHG/UK DESNZ emission registry, 12-mode CO2e & ambient PM2.5×hours comparison engines, `/impact` lab, `/api/ai/impact` grounded explanation, duplicate-guarded activity tracker, EN/HI UI | Completed |
| **Phase 05–07** | Final Polish, Community/Report/PWA & Production QA | Viewport-first AI Assistant redesign, Impact sync & signed-zero fixes, audited `2026.11-audit-v5` factors, enhanced Indoor/Sustainability/Community flows, Printable A4 Report (`/report`), static-only PWA manifest/SW + offline indicator, full EN/HI audit, two visual refinement passes, 70 unit + 20 E2E tests, genuine 6/6 Gemini smoke checks, repo size `< 5 MB` | Completed |
| **Phase 08** | Final QA, Security, AI Safety & Release Candidate | Practical daytime timing windows avoiding overnight dips (with midnight dates), intent-aware surgical AI safety overrides, 3-state AI provenance badges, safe indoor ventilation/exhaust guidance, Impact chart axis/color fixes, Google free-tier Gemini privacy disclosure, npm audit (`0` vulns), Open-Meteo & Gemini live evals, Playwright perf/a11y audit, 75 unit + 23 E2E tests | Completed |
| **Phase 09** | GitHub & Vercel Deployment Preparation | Full 48h forecast horizon coverage fix, Vercel production/preview URL & `x-forwarded-host` origin validation, `maxDuration = 30` on AI routes, aggregate per-IP AI quota limiter, Hobby-tier Vercel Firewall documentation, secret/byte-size audits, local Git release commit preparation | Completed |

## Acceptance Criteria by Phase

### Phase 00 — Foundation & Architecture
- Clean Next.js App Router TypeScript (`strict: true`) project compiles with zero errors.
- Design token system (`globals.css` & `src/lib/constants/tokens.ts`) defines light/dark atmospheric surfaces and AQI severity bands.
- Typed service interfaces exist for Air Quality, Gemini AI, Personalization, and Deterministic Impact.
- Server-only env validation prevents client key leakage; `.env.example` and `.gitignore` protect credentials.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all pass.
- Repository size (excluding `node_modules` and `.next`) is verified `< 5 MB`.

### Phase 01 — Live Air Quality & Location Engine
- Users can search Indian & global cities via Open-Meteo Geocoding or select curated presets (e.g., Delhi, Gurugram, Mumbai, Bengaluru).
- Dashboard displays current & 48-hour forecast data (`PM2.5`, `PM10`, `NO2`, `O3`, `CO`, `SO2`, `US AQI`) with explicit `live` / `cached` / `demonstration` labels and AQI standard disclaimer.
- Forecast charts render responsively with Recharts and handle offline/API errors gracefully.

### Phase 02 — Family Profile, Localization & Shell
- Users can configure household members (adults, children, elderly, respiratory sensitivity), commute habits, and budget tier persisted in `localStorage`.
- Full English (`en`) and Hindi (`hi`) UI translation toggle works seamlessly across navigation, dashboard, and forms.
- Landing page clearly communicates VayuWise AI's value proposition and routes directly into the interactive workspace.

### Phase 03 — Gemini AI Routine, Indoor Coach & Chat
- Server routes invoke `@google/genai` with `GEMINI_API_KEY` and validate structured outputs with Zod.
- Severe pollution events (`US AQI >= 201`) automatically trigger protective guidance overrides prioritizing respiratory safety over outdoor eco-commuting.
- AI responses clearly cite inputs and never fabricate medical diagnoses; unavailability falls back gracefully with explicit non-AI labeling.

### Phase 04 — Deterministic Impact, What-If & Budget Swaps
- Deterministic CO2e savings calculator separates climate metrics (`kg CO2e`) from personal exposure (`% outdoor/peak exposure avoided`) with transparent formulas.
- Budget-aware sustainable alternatives cover zero-cost, low-cost, and investment tiers.
- What-if comparator and activity streak tracker persist progress in `localStorage`.

### Phase 05 — Community Actions, Methodology, Voice/PWA & QA
- Community action module drafts practical neighborhood/RWA/school smog-response checklists.
- Methodology & Data Sources page documents Open-Meteo, CPCB vs. US AQI differences, WHO/ICMR-aligned guidance boundaries, and emission factor sources.
- Optional Web Speech voice query/readout and PWA manifest work without breaking accessibility.
- Full Vitest unit suite + Playwright E2E smoke tests pass against production build; repo stays well under 5 MB.
