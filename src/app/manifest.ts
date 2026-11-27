import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VayuWise AI — Breathe Smarter. Live Greener.",
    short_name: "VayuWise AI",
    description:
      "Location-aware air quality intelligence, indoor protection, and deterministic environmental impact planning for families.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#06120f",
    theme_color: "#34e8a5",
    icons: [
      {
        src: "/vayuwise-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
