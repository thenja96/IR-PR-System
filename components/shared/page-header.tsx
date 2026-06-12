import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  description,
  badge,
  badgeVariant = "info",
  actions,
}: {
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "ai";
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
