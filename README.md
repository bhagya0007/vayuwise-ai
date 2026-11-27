# VayuWise AI

**Breathe Smarter. Live Greener.**  
*PromptWars Virtual Challenge 6 — Urban Air Quality Assistant (Google for Developers & Hack2skill)*

---

## Challenge & Problem Statement

Urban households across winter-smog hotspots face severe particulate pollution episodes while needing practical daily routines that balance respiratory protection, indoor air hygiene, and sustainable low-emission habits. VayuWise AI converts modeled real-time air quality data and non-PII family preferences into actionable, health-first guidance, indoor protection checklists, community action plans, and verifiable commute emissions comparisons in English and Hindi.

---

## Core Features

- **Location-Aware Air Quality Intelligence (`/dashboard`):** Live Open-Meteo / CAMS modeled `US AQI`, pollutant concentrations & 24h sparklines (`PM₂.₅`, `PM₁₀`, `NO₂`, `O₃`, `SO₂`, `CO`), subindex dominant pollutant detection, 24h/48h forecast chart across local midnight boundaries, explicit **Forecast Lowest vs. Practical Daytime Window (07:00–20:00)** guidance (never suggesting overnight/00:30 errands), and global city search + optional browser geolocation.
- **Conversation-First AI Assistant & Daily Planner (`/assistant`, `/planner`):** Server-side Google Gemini (`@google/genai`) assistant and 6-slot chronological planner featuring viewport-pinned chat composer, Copy/Regenerate/Cancel/New Chat actions, intent-aware surgical safety overrides, verified public-health source citations, and explicit 3-state AI provenance (`Gemini AI`, `Gemini AI (Safety Adjusted)`, `Rule-Based Fallback`).
- **Indoor Air Coach, Sustainability Hub & Community Action Center (`/indoor-air`, `/sustainability`, `/community`):**
  - Unmeasured-indoor disclosure, room-specific cooking/filtration guidance, and exhaust-fan depressurization safety notes synced with a household checklist.
  - Budget-aware sustainable alternatives with side-by-side comparison cards, pre-filled Impact Calculator links, and progress logging.
  - Immediate, 7-day, and 30-day community smog plans with stakeholder categories, completion tracking, Copy, Share, and Print actions.
- **Deterministic Environmental Impact & Exposure Lab (`/impact`):** Audited 12-mode transport CO₂e calculator (`CEA India v20.0`, `India GHG Program v1.0`, `UK DESNZ 2024`), What-If simulator, semantically colored Recharts comparison bar chart with thousands-separated axes, separate ambient outdoor concentration-time (`PM₂.₅ × duration = µg·h/m³`) comparison, duplicate-guarded Activity Tracker, and Gemini explanations restricted strictly to deterministic numbers.
- **Personalization, Bilingual EN/HI, Printable A4 Report & Lightweight PWA (`/onboarding`, `/profile`, `/report`, `/settings`):** Optional 6-step onboarding, v2 local storage migration, full English & Hindi UI, selective A4 printable report (`@media print` with respiratory sensitivity excluded by default), static-only Service Worker (`public/sw.js` strictly bypassing `/api/*`), offline indicator, and `Delete All Local Data`.

---

## Technical Architecture

```mermaid
flowchart LR
    U[Browser / Mobile PWA<br/>EN / HI · Dark / Light<br/>localStorage Preferences] -->|"HTTP GET /api/air-quality<br/>GET /api/locations/search"| API_AQ[Next.js Route Handlers<br/>Zod Validation & SSRF-Safe Endpoints]
    U -->|"HTTP POST /api/ai/*<br/>Same-Origin + 32 KB Cap + Rate Limit"| API_AI[Next.js AI Route Layer<br/>resolveServerAiContext & Route Helper]
    API_AQ -->|"Modeled Forecasts & GeoNames"| OM[Open-Meteo Air Quality & Geocoding]
    API_AI -->|"Server-Side Weather Context"| OM
    API_AI -->|"Prompt + Environmental Context"| GEMINI["@google/genai Server Service<br/>gemini-3.1-flash-lite (primary)<br/>gemini-3.5-flash-lite (fallback)"]
    GEMINI -->|"Zod Schema Validation +<br/>Intent-Aware Safety Policies"| API_AI
    U -->|"Client-Only Math"| ENG[Deterministic CO₂e & Exposure Engines<br/>CEA / India GHG / UK DESNZ]
```

### Technology Stack
- **Framework:** Next.js `16.4.6` (App Router, Turbopack), React, TypeScript (`strict: true`)
- **Styling & UI:** Tailwind CSS v4 tokens, shadcn/ui primitives, Lucide icons, Motion, Recharts
- **GenAI & Validation:** `@google/genai`, Zod schemas, server-only runtime configuration (`src/config/env.ts`)
- **Testing:** Vitest + Testing Library (unit & AI safety evaluation) and Playwright Chromium (E2E & responsive checks)

---

## Genuine GenAI Integration & Safety Design

- Every `/api/ai/*` endpoint runs strictly server-side using `GEMINI_API_KEY`, defaulting to `gemini-3.1-flash-lite` with bounded concurrency (`4`), `18s` timeout, automatic Flash-Lite resilience fallback (`gemini-3.5-flash-lite`), `1` schema corrective retry, and explicit rule-based fallback on unavailability.
- System prompts wrap user messages in `<untrusted_user_input>` delimiters, cite only verified registry IDs (`WHO_AQG_2021`, `US_EPA_AQI`, `US_EPA_INDOOR`, `MOHFW_INDIA`, `NCDC_INDIA`, `OPEN_METEO_AQ`, `CEA_INDIA_CO2_V20`, `INDIA_GHG_TRANSPORT`, `UK_DESNZ_GHG_2024`), and distinguish **Gemini**, **Gemini (Safety Adjusted)**, and **Rule-Based Fallback**.

---

## Data Sources & Environmental Calculation Methodology

- **Air Quality:** Open-Meteo Air Quality API / Copernicus CAMS modeled `US AQI` and hourly pollutant concentrations (`µg/m³`). Explicitly labeled as modeled regional estimates — never official Indian CPCB NAQI ground-station data.
- **Transport Emission Factors (`EMISSION_FACTOR_REGISTRY_VERSION = "2026.11-audit-v5"`):**
  - *CEA CO₂ Baseline Database v20.0 (FY 2023-24):* India weighted grid factor `0.727 kg CO₂/kWh`.
  - *India GHG Program v1.0:* CNG Car `0.068 kg CO₂/vkm`, Petrol Two-Wheeler `0.0387 kg CO₂/vkm`, Intracity Bus `0.015161 kg CO₂/pkm`.
  - *UK DESNZ 2024:* Reference Petrol Car `0.163 kg CO₂e/vkm`, Diesel Car `0.170 kg CO₂e/vkm`.
  - *Accounting Boundaries:* Explicit separation of `vehicle_km` (`Distance × Factor ÷ Occupancy`), `passenger_km` (`Distance × Factor`), `CO2` vs. `CO2e`, `tailpipe_ttw` vs. `electricity_generation_scope2`, and ambient outdoor `PM₂.₅ × duration` (`µg·h/m³`, not inhaled dose or clinical risk).

---

## Local Setup & Environment Variables

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and configure:
   - `GEMINI_API_KEY`: Server-side Google AI Studio API key (never commit `.env.local`).
   - `GEMINI_MODEL`: Primary Gemini model (recommended: `gemini-3.1-flash-lite`).
   - `GEMINI_AI_ENABLED`: `true` or `false` kill-switch for AI routes.
   - `AI_RATE_LIMIT_PER_MIN`: Per-IP sliding-window limit per route bucket per Node isolate (default: `15`).
   - `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_URL`: Public app metadata.
3. Run locally or test production build:
   ```bash
   npm run dev     # Development server on http://localhost:3000
   npm run build   # Production build
   npm run start   # Production server
   ```

---

## Testing & Verification Commands

- `npm run typecheck` — Strict TypeScript check (`tsc --noEmit`)
- `npm run lint` — ESLint check across app and tests
- `npm run test` — Run all Vitest unit, integration, impact math, and 24-scenario AI safety tests (`75` tests)
- `npm run test:e2e` — Run all Playwright Chromium E2E tests (`23` tests)

---

## Security, Privacy & Known Limitations

- **Zero Client Key Leakage:** `GEMINI_API_KEY` is read exclusively inside `src/config/env.ts` server helpers and scanned absent from `.next/static`.
- **Google Gemini Free-Tier Disclosure:** Under Google's unpaid/free-tier Gemini API terms, prompts and outputs sent to the API may be logged or reviewed by Google to improve products/ML models. Users are explicitly cautioned not to enter medical records, personal identities, or confidential details.
- **PWA Cache Privacy:** `public/sw.js` caches only immutable static `/_next/static/*` assets and `.svg` icons, strictly bypassing `/api/*` and browser preferences.
- **Known Limitations:**
  - In serverless multi-instance deployments (e.g., Vercel), the built-in per-route (`15` req/min) and aggregate (`23`–`30` req/min) sliding-window limiters operate per Node.js isolate rather than globally across concurrent instances.
  - Regional CAMS/Open-Meteo forecasts do not measure household indoor air or hyperlocal street-level traffic spikes.

---

## Deployment Instructions (Vercel / Node.js)

1. Push the repository to GitHub (verifying `.env.local` is excluded).
2. Import the repository into Vercel (`Node >= 20`, Framework Preset: `Next.js`).
3. Set Environment Variables in Vercel Project Settings:
   - `GEMINI_API_KEY` = *your private Google AI Studio key (server-only)*
   - `GEMINI_MODEL` = `gemini-3.1-flash-lite`
   - `GEMINI_AI_ENABLED` = `true`
   - `AI_RATE_LIMIT_PER_MIN` = `15`
   - `NEXT_PUBLIC_APP_URL` = *your Vercel production URL (optional — automatically falls back to `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`)*
4. **Configure Vercel Firewall Rate Limiting (Hobby & Pro Plans Supported):**
   - Open Vercel Dashboard -> **Firewall** -> **Configure** -> **+ New Rule**.
   - **Condition:** `Request Path` -> `Starts With` -> `/api/ai/` (optional second condition: `Request Method` = `POST`).
   - **Action:** `Rate Limit` -> Strategy: `Fixed Window`, Window: `60s`, Limit: e.g. `15–20` requests per IP.
   - Click **Save Rule** and **Publish**. *(Vercel's free Hobby plan includes 1 custom rate-limiting rule per project and 1,000,000 monthly allowed requests; Pro increases rule limits. For multi-region stateful quotas, wire free-tier Upstash Redis.)*

---

## License, Privacy & Third-Party Attributions

- **Privacy:** Local browser preferences (`localStorage`) stay client-side; non-PII AI prompts do not persist in a VayuWise database. See Settings & `/report` for clear disclaimers and Google Gemini free-tier policy links.
- **Third-Party Data:** Modeled air quality & geocoding via [Open-Meteo](https://open-meteo.com/) & GeoNames; public health advisories from WHO, US EPA, India MoHFW / NCDC; transport emission factors from CEA India (`v20.0`), India GHG Program (`v1.0`), and UK DESNZ (`2024`).
- **Project Source License:** MIT / Challenge Submission Repository.
- **Technical Docs:** [System Architecture](docs/ARCHITECTURE.md) · [Project Roadmap](docs/PROJECT_ROADMAP.md) · [Phase Verification Report](docs/PHASE_REPORT.md)
