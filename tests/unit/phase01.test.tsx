import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { LandingPage } from "@/components/landing/LandingPage";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { AssistantView } from "@/components/assistant/AssistantView";
import { ProfileView } from "@/components/profile/ProfileView";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { getDemoForecast } from "@/lib/demo/air-quality-demo";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 640, height: 240 }}>{children}</div>
    ),
  };
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");

  const demoPayload = getDemoForecast("new-delhi");
  const modeledPayload = {
    ...demoPayload,
    provenance: {
      ...demoPayload.provenance,
      sourceName: "Open-Meteo / CAMS",
      dataSourceType: "modeled" as const,
      freshnessStatus: "fresh" as const,
      isStale: false,
    },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/locations/search")) {
        return new Response(
          JSON.stringify({
            ok: true,
            results: [
              {
                id: "om-1277333",
                name: "Bengaluru",
                region: "Karnataka",
                country: "India",
                countryCode: "IN",
                latitude: 12.9719,
                longitude: 77.5937,
                timezone: "Asia/Kolkata",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ ok: true, forecast: modeledPayload }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Phase 01 & 01.1 UI/UX & Dashboard Suite", () => {
  test("LandingPage renders hero, navigation, dark-first theme toggle, and language toggle", () => {
    render(
      <AppProviders>
        <LandingPage />
      </AppProviders>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /Breathe Smarter\./i })
    ).toBeDefined();
    expect(screen.getAllByText(/Get Started/i).length).toBeGreaterThanOrEqual(2);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Toggle dark -> light -> dark
    const lightBtn = screen.getByRole("button", { name: /Switch to light theme/i });
    fireEvent.click(lightBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    const darkBtn = screen.getByRole("button", { name: /Switch to dark theme/i });
    fireEvent.click(darkBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Language switching
    const langBtn = screen.getByRole("button", { name: /Switch language to Hindi/i });
    fireEvent.click(langBtn);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /समझदारी से सांस लें।/i,
      })
    ).toBeDefined();
  });

  test("DashboardView loads New Delhi modeled feed, US AQI category, and rule-based label", async () => {
    render(
      <AppProviders>
        <DashboardView />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "New Delhi" })).toBeDefined();
      expect(screen.getByText("248")).toBeDefined();
    });

    expect(screen.getByText("Very Unhealthy")).toBeDefined();
    expect(
      screen.getAllByText(/distinct from official Indian CPCB NAQI/i).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Rule-Based Intelligence/i)).toBeDefined();
  });

  test("DashboardView shows honest unavailable state on API failure and explicit demo switch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ ok: false, message: "Upstream unavailable" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(
      <AppProviders>
        <DashboardView />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/Live Air Quality Unavailable/i)).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /View Clearly Labeled Demo Mode/i })
    );

    expect(
      screen.getByText(/Demo Data — Not Current Air Quality Readings/i)
    ).toBeDefined();
  });

  test("ForecastChart renders unavailable/empty state cleanly", () => {
    render(
      <AppProviders>
        <ForecastChart
          hourly={[]}
          timezone="Asia/Kolkata"
          horizonHours={24}
          loading={false}
          emptyMessage="Hourly forecast points are currently unavailable."
        />
      </AppProviders>
    );

    expect(screen.getByText(/Forecast Data Unavailable/i)).toBeDefined();
    expect(
      screen.getByText(/Hourly forecast points are currently unavailable/i)
    ).toBeDefined();
  });

  test("ProfileView validates inputs and persists valid updates in localStorage", () => {
    render(
      <AppProviders>
        <ProfileView />
      </AppProviders>
    );

    const adultsInput = screen.getByLabelText(/Household Adults/i) as HTMLInputElement;
    fireEvent.change(adultsInput, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Preferences/i }));

    expect(screen.getByRole("alert")).toBeDefined();

    fireEvent.change(adultsInput, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Preferences/i }));

    const saved = window.localStorage.getItem("vayuwise.profile.v1");
    expect(saved).not.toBeNull();
    expect(saved).toContain('"householdAdults":3');
  });

  test("AssistantView supports suggested questions, error recovery fallback, and clear controls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: false,
            aiGenerated: false,
            errorCode: "UNCONFIGURED",
            message: "GEMINI_API_KEY not configured",
            fallbackData: {
              reply: "Deterministic Rule-Based Guidance (Not Gemini AI): Keep windows closed.",
              recommendations: [],
              cautions: ["Not Gemini AI"],
              sourceIds: ["WHO_AQG_2021"],
              dataBasis: "VayuWise Demo",
              whyThisRecommendation: "Fallback rule",
              disclaimer: "Info only",
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(
      <AppProviders>
        <AssistantView />
      </AppProviders>
    );

    const chip = screen.getByRole("button", {
      name: /How can I protect my family during severe smog\?/i,
    });
    fireEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByText(/Gemini AI Unavailable \(UNCONFIGURED\)/i)).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Show Deterministic Rule-Based Guidance/i,
      })
    );
    expect(screen.getByText(/Rule-Based Fallback \(Not Gemini AI\)/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Clear/i }));
    expect(screen.getByText(/Welcome to Vayu AI/i)).toBeDefined();
  });
});
