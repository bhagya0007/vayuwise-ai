"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  Leaf,
  MapPin,
  Menu,
  Settings,
  UserCog,
  Users,
  Wind,
  X,
} from "lucide-react";
import { VayuLogo } from "@/components/brand/VayuLogo";
import { LocaleToggle, ThemeToggle } from "@/components/common/Controls";
import { useAppPreferences } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  key: keyof ReturnType<typeof useAppPreferences>["dict"]["nav"];
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: readonly {
  groupKey: "intelligence" | "action" | "personalize";
  items: readonly NavItem[];
}[] = [
  {
    groupKey: "intelligence",
    items: [
      { href: "/dashboard", key: "dashboard", icon: Activity },
      { href: "/planner", key: "planner", icon: CalendarClock },
      { href: "/assistant", key: "assistant", icon: Bot },
    ],
  },
  {
    groupKey: "action",
    items: [
      { href: "/indoor-air", key: "indoorAir", icon: Wind },
      { href: "/sustainability", key: "sustainability", icon: Leaf },
      { href: "/impact", key: "impact", icon: BarChart3 },
      { href: "/community", key: "community", icon: Users },
    ],
  },
  {
    groupKey: "personalize",
    items: [
      { href: "/profile", key: "profile", icon: UserCog },
      { href: "/report", key: "report", icon: FileText },
      { href: "/settings", key: "settings", icon: Settings },
    ],
  },
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { dict, locale, selectedLocation } = useAppPreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        requestAnimationFrame(() => menuBtnRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const renderLinks = (isCollapsed: boolean, onNavigate?: () => void) => (
    <nav aria-label="Application navigation" className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.groupKey} className="space-y-1">
          {!isCollapsed ? (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {dict.navGroups[group.groupKey]}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const label = dict.nav[item.key];

            const linkNode = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                aria-label={isCollapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  isCollapsed && "justify-center px-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {!isCollapsed ? <span className="truncate">{label}</span> : null}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={linkNode} />
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkNode;
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        {dict.common.skipToContent}
      </a>

      {/* Collapsible Desktop Sidebar */}
      <aside
        className={cn(
          "print:hidden hidden lg:flex lg:shrink-0 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar transition-[width] duration-200",
          collapsed ? "lg:w-[76px]" : "lg:w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link href="/" className="rounded-lg focus-visible:outline-none">
            <VayuLogo
              showText={!collapsed}
              subtitle={!collapsed ? dict.tagline : undefined}
            />
          </Link>
          {!collapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setCollapsed(true)}
              aria-label={dict.common.collapseSidebar}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {renderLinks(collapsed)}
        </div>

        <div className="border-t border-sidebar-border p-3 space-y-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setCollapsed(false)}
                aria-label={dict.common.expandSidebar}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href="/"
                      aria-label={dict.nav.home}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    >
                      <Home className="size-4" aria-hidden="true" />
                    </Link>
                  }
                />
                <TooltipContent side="right">{dict.nav.home}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <Home className="size-3.5" aria-hidden="true" />
              <span>{dict.nav.home}</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print:hidden sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <Button
                ref={menuBtnRef}
                type="button"
                variant="outline"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-expanded={mobileMenuOpen}
                aria-controls="workspace-mobile-nav"
                aria-label={dict.common.menuLabel}
              >
                {mobileMenuOpen ? (
                  <X className="size-4" aria-hidden="true" />
                ) : (
                  <Menu className="size-4" aria-hidden="true" />
                )}
              </Button>
              <Link href="/" className="lg:hidden">
                <VayuLogo showText={false} />
              </Link>
              <Link href="/dashboard" className="min-w-0 flex-1 overflow-hidden sm:flex-none">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  <MapPin
                    className="size-3 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {selectedLocation.name}
                    {selectedLocation.region
                      ? `, ${selectedLocation.region}`
                      : ""}
                  </span>
                </span>
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <LocaleToggle />
              <ThemeToggle />
              <Link
                href="/profile"
                aria-label={dict.nav.profile}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <UserCog className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {mobileMenuOpen ? (
            <div
              id="workspace-mobile-nav"
              className="border-t border-border bg-sidebar px-4 py-4 lg:hidden"
            >
              {renderLinks(false, () => setMobileMenuOpen(false))}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <Home className="size-4" aria-hidden="true" />
                <span>{dict.nav.home}</span>
              </Link>
            </div>
          ) : null}
        </header>

        <main
          id="workspace-main"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-7 lg:pb-8"
        >
          {children}
        </main>

        {/* Compact Mobile Bottom Navigation: Home, Plan, AI, Impact, More */}
        <nav
          aria-label="Mobile bottom navigation"
          className="print:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-center px-1 py-1.5 text-[11px] font-medium">
            {[
              {
                href: "/dashboard",
                label: locale === "hi" ? "होम" : "Home",
                icon: Home,
              },
              {
                href: "/planner",
                label: locale === "hi" ? "योजना" : "Plan",
                icon: CalendarClock,
              },
              {
                href: "/assistant",
                label: "AI",
                icon: Bot,
              },
              {
                href: "/impact",
                label: locale === "hi" ? "प्रभाव" : "Impact",
                icon: BarChart3,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              className={cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors",
                mobileMenuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Menu className="size-4" aria-hidden="true" />
              <span>{locale === "hi" ? "अधिक" : "More"}</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
