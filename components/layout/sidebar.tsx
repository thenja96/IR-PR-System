"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Library,
  Radar,
  Swords,
  Newspaper,
  HelpCircle,
  Lightbulb,
  Megaphone,
  TrendingUp,
  MessagesSquare,
  FileBarChart,
  ShieldAlert,
  FileText,
  ShieldCheck,
  Coins,
  LineChart,
  CalendarClock,
  Zap,
  Brain,
  Ruler,
  GitBranch,
  Bell,
  BookOpen,
  HeartPulse,
  CalendarCheck,
  FileSpreadsheet,
  Settings,
  LogOut,
  ChevronDown,
  Briefcase,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const clientNav: NavItem[] = [
  { label: "Client Dashboard", href: "/client", icon: LayoutDashboard },
  { label: "Companies", href: "/client/companies", icon: Building2 },
  { label: "Source Library", href: "/client/source-library", icon: Library },
  { label: "Announcement Radar", href: "/client/announcement-radar", icon: Radar },
  { label: "Competitor Intelligence", href: "/client/competitor-intelligence", icon: Swords },
  { label: "News Impact Radar", href: "/client/news-impact", icon: Newspaper },
  { label: "Investor Concern Detector", href: "/client/investor-concerns", icon: HelpCircle },
  { label: "IR Angle Lab", href: "/client/ir-angle-lab", icon: Lightbulb },
  { label: "PR & Media Angles", href: "/client/pr-angles", icon: Megaphone },
  { label: "Add-On Opportunities", href: "/client/add-on-opportunities", icon: TrendingUp },
  { label: "Analyst Q&A Builder", href: "/client/analyst-qna", icon: MessagesSquare },
  { label: "Monthly Value Report", href: "/client/monthly-value-report", icon: FileBarChart },
  { label: "Crisis Monitor", href: "/client/crisis-monitor", icon: ShieldAlert },
  { label: "Report Builder", href: "/client/report-builder", icon: FileText },
  { label: "Compliance Checker", href: "/client/compliance-checker", icon: ShieldCheck },
];

const privateNav: NavItem[] = [
  { label: "Gold Dashboard", href: "/private-market/gold", icon: Coins },
  { label: "US Index Dashboard", href: "/private-market/us-indices", icon: LineChart },
  { label: "Macro Watch", href: "/private-market/macro-watch", icon: CalendarClock },
  { label: "Real-Time News Impact", href: "/private-market/news-impact", icon: Zap },
  { label: "AI Market Regime", href: "/private-market/market-regime", icon: Brain },
  { label: "Technical Structure", href: "/private-market/technical-structure", icon: Ruler },
  { label: "Scenario Planner", href: "/private-market/scenario-planner", icon: GitBranch },
  { label: "Alert Centre", href: "/private-market/alert-centre", icon: Bell },
  { label: "Trading Journal", href: "/private-market/trading-journal", icon: BookOpen },
  { label: "Risk Discipline Coach", href: "/private-market/risk-coach", icon: HeartPulse },
  { label: "Weekly Review", href: "/private-market/weekly-review", icon: CalendarCheck },
  { label: "Private Report Builder", href: "/private-market/report-builder", icon: FileSpreadsheet },
];

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md py-[7px] pl-3 pr-2.5 text-[13px] transition-colors",
        active
          ? "bg-teal-500/15 font-medium text-teal-300"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      )}
    >
      {active && (
        <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-teal-400" />
      )}
      <Icon
        className={cn(
          "h-[15px] w-[15px] shrink-0",
          active ? "text-teal-300" : "text-slate-500 group-hover:text-slate-300"
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroup({
  title,
  icon: Icon,
  items,
  badge,
  basePath,
  pathname,
  onNavigate,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  badge?: React.ReactNode;
  basePath: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const containsActive = pathname.startsWith(basePath);
  const [open, setOpen] = useState(containsActive);

  // Auto-expand the section when navigating into it from elsewhere.
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  const isActive = (href: string) =>
    href === basePath
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white/5"
      >
        <Icon className="h-4 w-4 text-teal-400/80" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-widest text-slate-300">
          {title}
        </span>
        {badge}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-500 transition-transform",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-px border-l border-white/5 pl-2 ml-4">
          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-navy-border bg-navy">
      {/* Brand */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex h-14 shrink-0 items-center gap-2.5 border-b border-navy-border px-4 transition-colors hover:bg-white/5"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-sm font-bold text-navy shadow-lg shadow-teal-500/20">
          A
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-white">
            Aegis MarketPulse
          </p>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.2em] text-teal-400">
            AI Intelligence
          </p>
        </div>
      </Link>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        {/* Dashboard */}
        <NavLink
          item={{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }}
          active={pathname === "/dashboard"}
          onNavigate={onNavigate}
        />

        <NavGroup
          title="Client IR/PR"
          icon={Briefcase}
          items={clientNav}
          basePath="/client"
          pathname={pathname}
          onNavigate={onNavigate}
        />

        <NavGroup
          title="Private Market"
          icon={Coins}
          items={privateNav}
          basePath="/private-market"
          pathname={pathname}
          onNavigate={onNavigate}
          badge={
            <span className="flex items-center gap-1 rounded bg-purple-500/20 px-1.5 py-px text-[9px] font-medium text-purple-300">
              <Lock className="h-2.5 w-2.5" /> private
            </span>
          }
        />
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-px border-t border-navy-border px-3 py-3">
        <NavLink
          item={{ label: "Settings", href: "/settings", icon: Settings }}
          active={pathname === "/settings" || pathname.startsWith("/settings/")}
          onNavigate={onNavigate}
        />
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-md py-[7px] pl-3 pr-2.5 text-[13px] text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
        >
          <LogOut className="h-[15px] w-[15px] text-slate-500" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
