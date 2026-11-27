# VayuWise AI — System Architecture

> **Tagline:** Breathe Smarter. Live Greener.  
> **Challenge:** Google for Developers & Hack2skill PromptWars Virtual Challenge 6

## 1. Architectural Goals

VayuWise AI is a location-aware, explainable, bilingual (English and Hindi) urban air quality assistant built with Next.js App Router, React, TypeScript (strict mode), Tailwind CSS, shadcn/ui, and the official Google `@google/genai` SDK.

Core architectural principles:

1. **Data Provenance & Transparency:** Every air-quality metric carries explicit provenance (`live`, `modeled`, `cached`, or `demonstration`), source attribution, timestamp, and AQI standard label (`US AQI` via Open-Meteo vs. official `India CPCB NAQI`). Open-Meteo US AQI is never mislabeled as Indian CPCB AQI.
2. **Strict Separation of Impact Domains:** Local pollutant concentrations (`PM2.5`, `PM10`, `NO2`, `SO2`, `O3`, `CO`), personal exposure risk, and deterministic greenhouse-gas savings (`CO2e`) are modeled and displayed independently so users never confuse climate mitigation with acute respiratory exposure reduction.
3. **Health-First Guardrails:** During severe or hazardous smog episodes, protective interventions (staying indoors, filtration, N95/FFP2 guidance, avoiding strenuous outdoor exercise) automatically take precedence over low-emission outdoor alternatives such as cycling or walking. No medical diagnoses or unsafe treatment advice are generated.
4. **Server-Side AI & Validation:** All Gemini requests execute strictly inside Next.js Route Handlers using `GEMINI_API_KEY` from server environment variables. Request payloads and AI outputs are validated with Zod schemas, with deterministic fallback behavior when APIs are unavailable or rate-limited.
5. **Zero Mandatory Auth / Lightweight Client Persistence:** Non-sensitive preferences (location, family profile, locale, activity logs) are stored in browser `localStorage` without requiring database infrastructure or mandatory accounts.

## 2. Directory Structure

```text
vayuwise-ai/
├── docs/
│   ├── ARCHITECTURE.md         # System architecture and boundaries
│   ├── PROJECT_ROADMAP.md      # Phased execution plan and acceptance criteria
│   └── PHASE_REPORT.md         # Verified phase execution log
├── public/                     # Static assets and PWA manifest/icons (future phases)
├── src/
│   ├── app/
│   │   ├── api/                # Server-only Route Handlers (air-quality, geocode, gemini)
│   │   ├── globals.css         # Tailwind v4 theme tokens & semantic AQI palette
│   │   ├── layout.tsx          # Root layout, fonts, metadata, providers
│   │   └── page.tsx            # Application entry shell
│   ├── components/
│   │   ├── layout/             # AppShell, navigation, language toggle, status banners
│   │   └── ui/                 # Accessible shadcn/ui primitives
│   ├── config/
│   │   └── env.ts              # Server/client validated environment configuration
│   ├── lib/
│   │   ├── constants/          # Design tokens, AQI band definitions, methodology refs
│   │   ├── i18n/               # English & Hindi dictionaries and locale helpers
│   │   ├── schemas/            # Shared Zod schemas for requests, profiles, AI outputs
│   │   └── utils.ts            # Classname and formatting utilities
│   ├── services/
│   │   ├── air-quality/        # Open-Meteo Air Quality & Geocoding service interfaces
│   │   ├── gemini/             # Server-side @google/genai service contracts
│   │   ├── impact/             # Deterministic CO2e and exposure reduction interfaces
│   │   └── personalization/    # Family profile & recommendation engine interfaces
│   └── types/                  # Domain types (AQI, provenance, profile, routines, impact)
├── tests/
│   ├── unit/                   # Vitest unit tests
│   └── e2e/                    # Playwright browser tests
├── .env.example                # Environment variable template
├── .gitignore                  # Excludes secrets, build outputs, and test artifacts
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js 16 App Router configuration
├── playwright.config.ts        # Playwright E2E configuration
├── tsconfig.json               # Strict TypeScript configuration
└── vitest.config.mts           # Vitest unit test configuration
```

## 3. Data & Service Boundaries

### 3.1 Air Quality & Geocoding (`src/services/air-quality/`, `src/lib/air-quality/`)
- **Providers:** Open-Meteo Air Quality API (`https://air-quality-api.open-meteo.com/v1/air-quality`, Copernicus CAMS modeled data) and Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`, GeoNames).
- **Server Routes:** `GET /api/air-quality` and `GET /api/locations/search` enforce coordinate/query Zod validation, SSRF-safe fixed upstream URLs, 8s `AbortController` timeouts, up to 2 bounded retries, in-flight request deduplication, per-instance sliding-window rate limiting, and TTL caching (`12 min` for air quality with `24h` stale fallback; `24h` for geocoding). *Note: In serverless deployments, in-memory cache/rate-limit state is isolate-local.*
- **AQI & Forecast Intelligence:** Subindex-only dominant pollutant calculation (`us_aqi_*`), `utc_offset_seconds` timestamp normalization across midnight/timezones, null-preserving pollutant formatting (`PM₂.₅`, `PM₁₀`, `NO₂`, `O₃`, `SO₂`, `CO`), contiguous 1h/2h relatively lower-exposure window detection, deterministic rule-based health protection guidance, and typed Phase 03 Gemini context builder (`src/lib/air-quality/gemini-context.ts`).
- **Provenance Model:** Every response explicitly tracks `{ dataSourceType: 'live' | 'modeled' | 'cached' | 'stale' | 'demonstration' | 'unavailable', aqiStandard: 'US_AQI', modelTimestampIso, fetchedAtIso, freshnessStatus, isStale }`. Open-Meteo US AQI is never presented as official Indian CPCB NAQI.

### 3.2 GenAI Orchestration (`src/services/gemini/`, `src/lib/ai/`)
- **SDK & Model:** `@google/genai` initialized strictly server-side using `GEMINI_API_KEY` and `GEMINI_MODEL` (`gemini-3.8-flash` default), plus `GEMINI_AI_ENABLED` emergency kill-switch.
- **Routes:** `POST /api/ai/chat`, `/api/ai/plan`, `/api/ai/indoor-air`, `/api/ai/sustainability`, `/api/ai/community` enforce same-origin checks, `32 KB` body limits, per-IP sliding-window rate limits, server-side Open-Meteo context resolution (`resolveServerAiContext`), `18s` `AbortController` timeouts, max `4` concurrent isolate calls, and `1` corrective retry on schema mismatch (zero retries on `401/403` or `429`).
- **Prompting, Knowledge & Safety:** Versioned central system prompt (`vayu-ai-2026.11.03`) wraps user inputs in `<untrusted_user_input>` delimiters; `src/lib/ai/knowledge-registry.ts` resolves citations strictly to verified public-health IDs (`WHO_AQG_2021`, `US_EPA_AQI`, `US_EPA_INDOOR`, `MOHFW_INDIA`, `NCDC_INDIA`, `OPEN_METEO_AQ`); `src/lib/ai/safety.ts` strips raw HTML, blocks medical diagnosis, unsafe outdoor exercise during high AQI, ozone cleaners, and fabricated numeric CO2e claims, and applies conservative overrides. Fallback rule-based responses are always explicitly labeled `aiGenerated: false`.

### 3.3 Personalization & Deterministic Impact (`src/lib/personalization/`, `src/lib/impact/`, `src/app/api/ai/impact/`)
- **Versioned Profiles & Optional Onboarding (`profile-storage.ts`, `OnboardingWizard.tsx`):** Supports 6 profile types (`individual`, `student`, `working_professional`, `family_household`, `senior_citizen`, `community_representative`), commute frequency/occupancy/working weeks, work schedules, cooking practices, opt-in sensitivity flag, v1->v2 migration stripping any unknown/PII keys, plus edit/reset/delete controls and an optional 6-step onboarding flow (`/onboarding`).
- **Personalization & Priority Scoring (`engine.ts`):** Produces a `NormalizedPersonalizationContext`, recommendation stale-detection fingerprints (`PersonalizationStatusStrip`), and transparent deterministic scoring where health protection strictly overrides outdoor eco-commuting under unhealthy smog.
- **Documented Emission Factor Registry (`emission-factors.ts`, Version `2026.11-audit-v5`):** Covers 12 modes using CEA CO2 Baseline Database v20.0 (`0.727 kg CO2/kWh`), India GHG Program v1.0 (`CNG car`, `two-wheeler`, `intracity bus`), UK DESNZ 2024 (`petrol`/`diesel` cars), NITI Aayog EV energy benchmarks, and GHG Protocol operational zero scopes, explicitly tagging `gasBasis` (`CO2 | CO2e | zero_operational`), `isDerivedEstimate`, `tableReference`, `vehicle_km` vs `passenger_km`, and `tailpipe_ttw` vs `electricity_generation_scope2` boundaries.
- **Transport, Concentration-Time & Activity Engines:** Auditable `compareTransportScenarios` formulas (`Distance × Factor ÷ Occupancy` for vkm; `Distance × Factor` for pkm), signed-zero sanitizer `formatSignedCo2eDiff` preventing `-0.00`, separate `compareOutdoorConcentrationTime` (`PM2.5 × hours = µg·h/m³`, non-dose disclosure), and duplicate-guarded `localStorage` activity logs (`vayuwise.activities.v1`). Gemini explains deterministic results via `POST /api/ai/impact` under `applyImpactExplainSafetyPolicy`.
- **Configurable Rate Limiting & Lightweight PWA Shell (`env.ts`, `route-helper.ts`, `manifest.ts`, `public/sw.js`):** Server rate limits read `AI_RATE_LIMIT_PER_MIN` (default `15` req/min per route bucket per IP in isolate memory); `manifest.ts` (`/manifest.webmanifest`), SVG icons, offline indicator (`PwaAndOfflineBar.tsx`), printable report (`/report`), and static-only `public/sw.js` enhance installability and offline readiness while strictly bypassing `/api/*` and client storage.

## 4. Planned 16 Modules Mapping

1. Landing page & problem framing (`src/app/page.tsx`)
2. Location-aware AQI dashboard (`src/components/dashboard/`)
3. Pollution forecast & pollutant charts (Recharts)
4. Family & lifestyle profile (`localStorage` + Zod)
5. Gemini-powered daily routine generator (`/api/gemini/routine`)
6. Personalized indoor air quality coach (`/api/gemini/indoor-coach`)
7. Budget-aware sustainable alternatives catalog + AI tailoring
8. Deterministic environmental impact calculator (`src/services/impact/`)
9. What-if scenario comparison view
10. Context-aware AI chat assistant (`/api/gemini/chat`)
11. Community action planner (`/api/gemini/community`)
12. Sustainable activity progress tracker (`localStorage`)
13. English (`en`) and Hindi (`hi`) localization (`src/lib/i18n/`)
14. Accessibility (WCAG AA contrast, keyboard nav, reduced motion) & responsive mobile-first UI
15. Optional Web Speech API voice interaction & PWA manifest/offline banner
16. Transparent data source & methodology documentation page/drawer

## 5. Security & Size Constraints

- `GEMINI_API_KEY` is read exclusively in `src/config/env.ts` server helpers and never imported into `'use client'` modules.
- Repository size target is `< 5 MB` (strictly `< 10 MB` GitHub limit) by keeping assets lightweight (vector icons, SVG/CSS visuals, no bloated media binaries).
