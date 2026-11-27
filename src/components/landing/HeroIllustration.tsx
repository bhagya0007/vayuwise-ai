interface HeroIllustrationProps {
  smogLabel: string;
  cleanLabel: string;
}

export function HeroIllustration({
  smogLabel,
  cleanLabel,
}: HeroIllustrationProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <svg
        viewBox="0 0 560 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Illustration contrasting dense winter urban smog on the left with cleaner sustainable transit and greenery on the right"
        className="h-auto w-full rounded-xl"
      >
        <defs>
          <linearGradient id="smogSky" x1="0" y1="0" x2="280" y2="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#475569" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="cleanSky" x1="280" y1="0" x2="560" y2="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#093B37" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* Left panel: Winter smog */}
        <rect x="0" y="0" width="280" height="320" fill="url(#smogSky)" />
        {/* Smog haze bands */}
        <ellipse cx="120" cy="86" rx="110" ry="22" fill="#94A3B8" fillOpacity="0.35" />
        <ellipse cx="155" cy="128" rx="125" ry="20" fill="#D97706" fillOpacity="0.18" />
        {/* Dense urban buildings & traffic */}
        <rect x="26" y="160" width="44" height="110" rx="4" fill="#334155" />
        <rect x="78" y="130" width="52" height="140" rx="4" fill="#1E293B" />
        <rect x="138" y="176" width="42" height="94" rx="4" fill="#475569" />
        <rect x="188" y="148" width="56" height="122" rx="4" fill="#334155" />
        {/* Particulate dots */}
        <circle cx="56" cy="108" r="3" fill="#F97316" fillOpacity="0.7" />
        <circle cx="112" cy="72" r="2.5" fill="#EA580C" fillOpacity="0.65" />
        <circle cx="204" cy="102" r="3.5" fill="#F59E0B" fillOpacity="0.6" />
        <circle cx="238" cy="122" r="2.5" fill="#F97316" fillOpacity="0.7" />
        {/* Ground road */}
        <rect x="0" y="270" width="280" height="50" fill="#1E293B" />
        <rect x="44" y="252" width="48" height="20" rx="6" fill="#64748B" />
        <rect x="150" y="252" width="52" height="20" rx="6" fill="#94A3B8" />

        {/* Divider airflow wave */}
        <path
          d="M280 0 C266 80, 294 160, 280 240 C272 280, 286 300, 280 320"
          stroke="#10B981"
          strokeWidth="3"
          strokeDasharray="6 6"
        />

        {/* Right panel: Smarter cleaner living */}
        <rect x="280" y="0" width="280" height="320" fill="url(#cleanSky)" />
        {/* Clean airflow ribbons */}
        <path
          d="M304 88C346 66 392 66 436 86C468 100 502 98 532 80"
          stroke="#10B981"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M312 118C354 98 398 98 440 116C472 128 504 126 530 112"
          stroke="#6EE7B7"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Clean home with indoor filtration indicator */}
        <path d="M362 198L422 152L482 198V270H362V198Z" fill="#093B37" />
        <rect x="386" y="206" width="32" height="28" rx="4" fill="#6EE7B7" fillOpacity="0.88" />
        <rect x="434" y="218" width="26" height="52" rx="4" fill="#10B981" />
        {/* Trees */}
        <circle cx="326" cy="222" r="24" fill="#10B981" />
        <rect x="323" y="242" width="6" height="28" rx="2" fill="#093B37" />
        <circle cx="516" cy="216" r="28" fill="#059669" />
        <rect x="513" y="240" width="6" height="30" rx="2" fill="#093B37" />
        {/* Green ground */}
        <rect x="280" y="270" width="280" height="50" fill="#093B37" />
        {/* Elevated clean metro rail */}
        <rect x="296" y="176" width="84" height="18" rx="9" fill="#10B981" />
        <rect x="308" y="180" width="16" height="8" rx="2" fill="#ECFDF5" />
        <rect x="330" y="180" width="16" height="8" rx="2" fill="#ECFDF5" />
        <rect x="352" y="180" width="16" height="8" rx="2" fill="#ECFDF5" />
      </svg>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-900 dark:text-amber-300">
          <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
          {smogLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-900 dark:text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {cleanLabel}
        </span>
      </div>
    </div>
  );
}
