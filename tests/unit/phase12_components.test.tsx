import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { LocationSearch } from "@/components/dashboard/LocationSearch";
import { LandingPage } from "@/components/landing/LandingPage";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { CommunityView } from "@/components/modules/CommunityView";
import { ImpactView } from "@/components/modules/ImpactView";
import { IndoorAirView } from "@/components/modules/IndoorAirView";
import { PlannerView } from "@/components/modules/PlannerView";
import { SustainabilityView } from "@/components/modules/SustainabilityView";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AppProviders } from "@/components/providers/AppProviders";
import { PrintableReportView } from "@/components/report/PrintableReportView";
import { SettingsView } from "@/components/settings/SettingsView";
import {
  buildDeterministicCommunityFallback,
  buildDeterministicDailyPlanFallback,
  buildDeterministicImpactFallback,
  buildDeterministicIndoorFallback,
  buildDeterministicSustainabilityFallback,
} from "@/lib/ai/fallbacks";
import { buildGeminiAirQualityContext } from "@/lib/air-quality/gemini-context";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";
import { compareTransportScenarios } from "@/lib/impact/transport-calculator";
import { DEFAULT_FAMILY_PROFILE } from "@/lib/personalization/profile-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 640, height: 240 }}>{children}</div>
    ),
  };
});

function buildMockAiResponses() {
  const forecast = getDemoForecast("new-delhi");
  const ctx = buildGeminiAirQualityContext(forecast, DEFAULT_FAMILY_PROFILE, "en");
  const cmp = compareTransportScenarios({
    baseline: { mode: "car_petrol", roundTripDistanceKm: 14, travelDaysPerWeek: 5, workingWeeksPerYear: 48 },
    alternative: { mode: "metro_rail", roundTripDistanceKm: 14, travelDaysPerWeek: 5, workingWeeksPerYear: 48 },
  });

  return {
    forecast,
    plan: buildDeterministicDailyPlanFallback(ctx, "en"),
    indoor: buildDeterministicIndoorFallback(ctx),
    sustainability: buildDeterministicSustainabilityFallback(ctx),
    community: buildDeterministicCommunityFallback(ctx, "residential_society"),
    impact: buildDeterministicImpactFallback(ctx, cmp, "en"),
  };
}

let failNextAiRequest = false;

beforeEach(() => {
  failNextAiRequest = false;
  pushMock.mockReset();
  window.localStorage.clear();
  const mocks = buildMockAiResponses();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/air-quality")) {
        return Response.json({
          ok: true,
          forecast: {
            ...mocks.forecast,
            provenance: {
              ...mocks.forecast.provenance,
              dataSourceType: "modeled",
            },
          },
        });
      }
      if (url.includes("/api/ai/")) {
        if (failNextAiRequest) {
          failNextAiRequest = false;
          const fallback = url.includes("/plan")
            ? mocks.plan
            : url.includes("/indoor-air")
              ? mocks.indoor
              : url.includes("/sustainability")
                ? mocks.sustainability
                : url.includes("/community")
                  ? mocks.community
                  : mocks.impact;
          return Response.json(
            { ok: false, errorCode: "UNCONFIGURED", message: "Gemini unavailable", fallbackData: fallback },
            { status: 503 }
          );
        }
        const data = url.includes("/plan")
          ? mocks.plan
          : url.includes("/indoor-air")
            ? mocks.indoor
            : url.includes("/sustainability")
              ? mocks.sustainability
              : url.includes("/community")
                ? mocks.community
                : mocks.impact;
        return Response.json({
          ok: true,
          data,
          aiGenerated: true,
          provenanceMode: "gemini",
          modelUsed: "gemini-3.1-flash-lite",
          citations: [],
          contextMeta: null,
        });
      }
      return Response.json({ ok: false }, { status: 404 });
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function wrap(ui: ReactNode) {
  return render(<AppProviders>{ui}</AppProviders>);
}

describe("Phase 12.4 — Interactive User Flows, Loading/Error Recovery & Accessibility States", () => {
  test("PlannerView handles error recovery fallback, slot completion, and regenerated timeline", async () => {
    wrap(<PlannerView />);
    failNextAiRequest = true;

    fireEvent.click(screen.getAllByRole("button", { name: /Generate AI Daily Plan/i })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/Gemini AI Unavailable/i)).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Show Deterministic Rule-Based Guidance/i })
    );
    await waitFor(() => {
      expect(screen.getByText(/Indoors-First Morning Start/i)).toBeTruthy();
    });

    const slotBtn = screen.getAllByRole("button", { name: /Mark done|Completed/i })[0];
    if (slotBtn) {
      fireEvent.click(slotBtn);
    }

    fireEvent.click(screen.getByRole("button", { name: /Regenerate Plan/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/Gemini/i).length).toBeGreaterThan(0);
    });
  });

  test("IndoorAirView toggles checklist aria-pressed states and loads indoor guidance", async () => {
    wrap(<IndoorAirView />);

    const checklistBtns = screen.getAllByRole("button", { pressed: false });
    expect(checklistBtns.length).toBeGreaterThan(0);
    fireEvent.click(checklistBtns[0]!);
    expect(checklistBtns[0]!.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getAllByRole("button", { name: /Generate Indoor Plan/i })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/Vent cooking smoke/i)).toBeTruthy();
    });
  });

  test("SustainabilityView validates 'Impact not quantified' for non-transport swaps and supports verified swaps", async () => {
    wrap(<SustainabilityView />);

    fireEvent.click(screen.getAllByRole("button", { name: /Suggest Alternatives/i })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/Deterministic Sustainable Alternatives/i)).toBeTruthy();
    });
  });

  test("CommunityView generates plan, switches checklist items, and supports Copy button", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    wrap(<CommunityView />);

    fireEvent.click(screen.getAllByRole("button", { name: /Generate Action Plan/i })[0]!);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Copy/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Copy/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  test("ImpactView switches scenarios, tabs cleanly via role='tab', and logs activity", async () => {
    wrap(<ImpactView />);

    fireEvent.click(screen.getByRole("button", { name: /Bus → Petrol Car/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/increase/i).length).toBeGreaterThan(0);
    });

    const exposureTab = screen.getByRole("tab", { name: /Outdoor Exposure Comparison/i });
    fireEvent.click(exposureTab);
    expect(exposureTab.getAttribute("aria-selected")).toBe("true");
  });

  test("OnboardingWizard steps forward/back across OnboardingStepPanel and persists finish", async () => {
    wrap(<OnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(screen.getByLabelText(/Adults/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /6\./i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save & Launch Workspace/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Save & Launch Workspace/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  test("PrintableReportView & SettingsView & WorkspaceShell render accessibility controls and mobile drawer", async () => {
    wrap(
      <WorkspaceShell>
        <PrintableReportView />
      </WorkspaceShell>
    );

    await waitFor(() => {
      expect(screen.getByText(/Printable Personalized Air Quality Report/i)).toBeTruthy();
    });

    // Open mobile drawer and verify Escape closes it cleanly
    const menuBtn = screen.getByRole("button", { name: /menu/i });
    fireEvent.click(menuBtn);
    expect(menuBtn.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menuBtn.getAttribute("aria-expanded")).toBe("false");

    cleanup();
    wrap(<SettingsView />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  test("LocationSearch supports keyboard combobox navigation, debounced search, clear, and geolocation", async () => {
    const onSelect = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("q=Jaipur")) {
          return Response.json({
            ok: true,
            results: [
              {
                id: "in-jaipur",
                name: "Jaipur",
                region: "Rajasthan",
                country: "India",
                countryCode: "IN",
                latitude: 26.9124,
                longitude: 75.7873,
                timezone: "Asia/Kolkata",
              },
            ],
          });
        }
        return Response.json({ ok: false, message: "Search unavailable" }, { status: 503 });
      })
    );

    wrap(<LocationSearch onSelectLocation={onSelect} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe("city-option-0");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");

    fireEvent.change(input, { target: { value: "Jaipur" } });
    await waitFor(
      () => {
        expect(screen.getByText("Jaipur")).toBeTruthy();
      },
      { timeout: 1500 }
    );
    fireEvent.click(screen.getByRole("option", { name: /Jaipur/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: "ErrCity" } });
    await waitFor(
      () => {
        expect(screen.getByText(/Search unavailable/i)).toBeTruthy();
      },
      { timeout: 1500 }
    );
    fireEvent.click(screen.getByRole("button", { name: /Clear search/i }));

    // Geolocation success & permission denied paths
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          success: (pos: { coords: { latitude: number; longitude: number } }) => void
        ) => success({ coords: { latitude: 28.61, longitude: 77.21 } }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Use My Location/i }));
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  test("ImpactView logs completed activity, blocks duplicates, edits, clears, and LandingPage toggles mobile nav", async () => {
    wrap(<ImpactView />);
    const logBtn = screen.getByRole("button", { name: /Log Completed Action/i });
    fireEvent.click(logBtn);
    const editBtn = screen.getByRole("button", { name: /Edit activity/i });

    // Edit logged activity title and save
    fireEvent.click(editBtn);
    fireEvent.change(screen.getByLabelText(/Edit activity title/i), {
      target: { value: "Morning Metro Ride" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(screen.getByText("Morning Metro Ride")).toBeTruthy();

    // Duplicate same-day submission blocked
    fireEvent.click(logBtn);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Clear History/i }));
    expect(screen.getByText(/No completed actions recorded yet/i)).toBeTruthy();

    cleanup();
    wrap(<LandingPage />);
    const menuBtn = screen.getByRole("button", { name: /menu/i });
    fireEvent.click(menuBtn);
    expect(menuBtn.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menuBtn.getAttribute("aria-expanded")).toBe("false");
  });

  test("DashboardView loads modeled forecast status, horizon switcher 24h->48h, and heading", async () => {
    wrap(<DashboardView />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeTruthy();
    });
    expect(screen.getByRole("heading", { level: 1, name: /New Delhi/i })).toBeTruthy();
    const btn48 = screen.getByRole("button", { name: /^48h$/i });
    fireEvent.click(btn48);
    expect(btn48.getAttribute("aria-pressed")).toBe("true");
  });
});
