"use client";

import { motion } from "motion/react";
import { ShieldCheck, Sparkles, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeroVisualizationProps {
  smogLabel: string;
  cleanLabel: string;
  previewBadge: string;
  locale?: "en" | "hi";
}

export function HeroVisualization({
  smogLabel,
  cleanLabel,
  previewBadge,
  locale = "en",
}: HeroVisualizationProps) {
  const isHi = locale === "hi";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-6"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          <Sparkles className="size-3" aria-hidden="true" />
          {previewBadge}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-[#071814]">
        <svg
          viewBox="0 0 640 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Atmospheric visualization contrasting dense winter urban smog on the left with cleaner green transit, filtration, and electric mint airflow on the right"
          className="h-auto w-full block"
        >
          <defs>
            <linearGradient id="skyHaze" x1="0" y1="0" x2="340" y2="320" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1B2A2E" />
              <stop offset="55%" stopColor="#3B2B23" />
              <stop offset="100%" stopColor="#0D2923" />
            </linearGradient>
            <linearGradient id="cleanAtmosphere" x1="310" y1="0" x2="640" y2="340" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#092620" />
              <stop offset="100%" stopColor="#0D3B30" />
            </linearGradient>
            <linearGradient id="mintStream" x1="250" y1="90" x2="620" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFB547" stopOpacity="0.65" />
              <stop offset="45%" stopColor="#34E8A5" />
              <stop offset="100%" stopColor="#A8C9B7" />
            </linearGradient>
          </defs>

          {/* Dual atmospheric backdrop */}
          <rect x="0" y="0" width="320" height="360" fill="url(#skyHaze)" />
          <rect x="320" y="0" width="320" height="360" fill="url(#cleanAtmosphere)" />

          {/* Subtle horizon grid */}
          <path d="M0 285H640" stroke="#A8C9B7" strokeOpacity="0.2" strokeWidth="1" />
          <path d="M0 245H640" stroke="#A8C9B7" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="4 6" />

          {/* Smog inversion haze layers (left) */}
          <ellipse cx="140" cy="108" rx="155" ry="28" fill="#FFB547" fillOpacity="0.14" />
          <ellipse cx="185" cy="154" rx="165" ry="24" fill="#FF647C" fillOpacity="0.12" />
          <ellipse cx="110" cy="186" rx="130" ry="20" fill="#94A3B8" fillOpacity="0.14" />

          {/* Layered Urban Skyline (left) */}
          <rect x="24" y="182" width="34" height="103" rx="3" fill="#13252A" />
          <rect x="64" y="146" width="44" height="139" rx="3" fill="#1A3035" />
          <rect x="116" y="122" width="50" height="163" rx="4" fill="#0F2024" />
          <rect x="174" y="164" width="38" height="121" rx="3" fill="#182C31" />
          <rect x="220" y="138" width="46" height="147" rx="4" fill="#12262A" />
          <rect x="272" y="190" width="34" height="95" rx="3" fill="#182E32" />

          {/* Subtle lit city windows */}
          <rect x="74" y="164" width="6" height="6" rx="1" fill="#FFB547" fillOpacity="0.65" />
          <rect x="88" y="164" width="6" height="6" rx="1" fill="#FFB547" fillOpacity="0.4" />
          <rect x="128" y="140" width="7" height="7" rx="1" fill="#FFB547" fillOpacity="0.55" />
          <rect x="145" y="158" width="7" height="7" rx="1" fill="#FF647C" fillOpacity="0.55" />
          <rect x="234" y="158" width="6" height="6" rx="1" fill="#FFB547" fillOpacity="0.6" />

          {/* Ambient drifting particulates */}
          <motion.circle
            cx="78"
            cy="96"
            r="3.2"
            fill="#FFB547"
            animate={{ cy: [96, 86, 96], opacity: [0.45, 0.85, 0.45] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="176"
            cy="82"
            r="2.6"
            fill="#FF647C"
            animate={{ cy: [82, 92, 82], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 5.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="248"
            cy="118"
            r="3"
            fill="#FFB547"
            animate={{ cx: [248, 258, 248], opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Clean transition airflow streamlines (across divider into right) */}
          <motion.path
            d="M250 112C320 82 396 86 470 106C524 120 578 112 624 84"
            stroke="url(#mintStream)"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0.7, opacity: 0.75 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
          <path
            d="M270 144C340 120 418 122 488 138C536 148 584 142 626 122"
            stroke="#34E8A5"
            strokeOpacity="0.55"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M294 174C358 154 428 158 492 170C538 178 580 172 618 156"
            stroke="#A8C9B7"
            strokeOpacity="0.4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5 6"
          />

          {/* Elevated Clean Metro Rail (right) */}
          <rect x="336" y="206" width="276" height="5" rx="2.5" fill="#1B4D42" />
          <rect x="356" y="186" width="112" height="20" rx="10" fill="#34E8A5" />
          <rect x="372" y="191" width="18" height="9" rx="2.5" fill="#071814" fillOpacity="0.75" />
          <rect x="396" y="191" width="18" height="9" rx="2.5" fill="#071814" fillOpacity="0.75" />
          <rect x="420" y="191" width="18" height="9" rx="2.5" fill="#071814" fillOpacity="0.75" />
          <rect x="444" y="191" width="12" height="9" rx="2.5" fill="#071814" fillOpacity="0.75" />

          {/* Clean Filtered Home & Urban Canopy (right) */}
          <path d="M484 224L538 184L592 224V285H484V224Z" fill="#0F352C" stroke="#34E8A5" strokeOpacity="0.45" strokeWidth="1.5" />
          <rect x="504" y="232" width="26" height="24" rx="4" fill="#34E8A5" fillOpacity="0.85" />
          <rect x="544" y="242" width="24" height="43" rx="4" fill="#10B981" />

          {/* Greenery */}
          <circle cx="366" cy="242" r="24" fill="#10B981" fillOpacity="0.9" />
          <rect x="363" y="262" width="6" height="23" rx="2" fill="#06211B" />
          <circle cx="430" cy="248" r="20" fill="#34E8A5" fillOpacity="0.75" />
          <rect x="427" y="264" width="6" height="21" rx="2" fill="#06211B" />
          <circle cx="614" cy="238" r="22" fill="#10B981" fillOpacity="0.85" />
          <rect x="611" y="256" width="6" height="29" rx="2" fill="#06211B" />

          {/* Ground plane */}
          <rect x="0" y="285" width="320" height="75" fill="#0C1719" />
          <rect x="320" y="285" width="320" height="75" fill="#09241D" />
        </svg>

        {/* Integrated Floating Intelligence & Illustrative AQI Card */}
        <div className="grid grid-cols-1 gap-2.5 border-t border-white/10 bg-[#0B221D]/95 p-3.5 text-[#F5F9F7] sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <div>
              <p className="whitespace-nowrap text-[10px] uppercase tracking-wider text-[#A8C9B7] sm:text-[11px]">
                {isHi ? "उदाहरणात्मक US AQI" : "Illustrative US AQI"}
              </p>
              <p className="font-mono text-xl font-semibold text-[#FFB547]">
                248 <span className="text-xs font-normal text-[#A8C9B7]">· {isHi ? "डेमो" : "Demo"}</span>
              </p>
            </div>
            <Badge className="border-amber-400/35 bg-amber-500/15 text-[#FFB547] hover:bg-amber-500/20">
              {isHi ? "बहुत अस्वस्थ" : "Very Unhealthy"}
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5">
            <ShieldCheck className="size-5 shrink-0 text-[#34E8A5]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#F5F9F7]">
                {isHi ? "स्वास्थ्य सुरक्षा सक्रिय" : "Health Protection Active"}
              </p>
              <p className="truncate text-[11px] text-[#A8C9B7]">
                {isHi ? "सुबह का व्यायाम घर के भीतर करें · बंद मेट्रो" : "Shift morning exercise indoors · enclosed metro"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-900 dark:text-[#FFB547]">
          <span className="size-2 rounded-full bg-[#FFB547]" aria-hidden="true" />
          {smogLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-900 dark:text-[#34E8A5]">
          <Wind className="size-3.5" aria-hidden="true" />
          {cleanLabel}
        </span>
      </div>
    </motion.div>
  );
}
