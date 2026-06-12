// Instant feedback for every navigation inside the app shell: Next.js shows
// this the moment a link is clicked, while the server-rendered page loads.

import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-medium text-teal-700">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading page…
      </div>

      {/* Page header */}
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Stat / summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2.5 p-5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content block */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
