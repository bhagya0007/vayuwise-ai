import { cn } from "@/lib/utils";

interface VayuLogoProps {
  className?: string;
  showText?: boolean;
  subtitle?: string;
}

export function VayuLogo({
  className,
  showText = true,
  subtitle,
}: VayuLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-9 shrink-0 rounded-xl shadow-xs"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="10" fill="#093B37" />
        <path
          d="M8.5 16.5C13 12.5 18 12.5 22.5 15C25.5 16.8 29 16.8 31.5 14.5"
          stroke="#6EE7B7"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M8.5 23.5C13 20 17.5 20 21.5 22C24.5 23.6 28 23.2 31 20.5"
          stroke="#10B981"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M22.5 30C27.5 30 31.2 26.2 31.2 21.4C31.2 21.4 26.2 21.7 23.6 24.3C22 25.9 21.7 28 22.5 30Z"
          fill="#6EE7B7"
        />
        <circle cx="12.5" cy="29" r="2" fill="#6EE7B7" />
      </svg>
      {showText && (
        <div className="min-w-0 leading-tight">
          <span className="block truncate text-base font-semibold tracking-tight text-foreground">
            VayuWise AI
          </span>
          {subtitle ? (
            <span className="hidden sm:block truncate text-[11px] text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
