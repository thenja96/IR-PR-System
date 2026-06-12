"use client";

// Responsive app shell: fixed sidebar on desktop, slide-over drawer on
// tablet/mobile with a compact top bar.

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-navy-border bg-navy px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/10"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-bold text-navy">
            A
          </div>
          <p className="text-sm font-semibold text-white">Aegis MarketPulse</p>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-2 top-3 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="min-h-screen min-w-0 p-4 sm:p-6 lg:ml-64 lg:p-8">
        {children}
      </main>
    </div>
  );
}
