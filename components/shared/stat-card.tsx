import { type LucideIcon, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delta,
  deltaLabel,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "ai";
  /** Percent change — renders a coloured up/down chip */
  delta?: number | null;
  deltaLabel?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "text-primary bg-primary/10",
    success: "text-teal-600 bg-teal-50",
    warning: "text-amber-600 bg-amber-50",
    danger: "text-red-600 bg-red-50",
    ai: "text-purple-600 bg-purple-50",
  };
  const showDelta = delta !== undefined && delta !== null && !Number.isNaN(delta);

  return (
    <Card className="min-w-0">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[13px] font-medium text-muted-foreground">
            {title}
          </p>
          {Icon && (
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                toneClasses[tone]
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {showDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                delta! >= 0
                  ? "bg-teal-50 text-teal-700"
                  : "bg-red-50 text-red-700"
              )}
            >
              {delta! >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {formatNumber(Math.abs(delta!))}%{deltaLabel ? ` ${deltaLabel}` : ""}
            </span>
          )}
        </div>
        {hint && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
