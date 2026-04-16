"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { APP_NAME } from "@/lib/constants";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { SearchBar } from "@/components/chat/SearchBar";

const navItems = [
  { href: "/chat", label: "💬 Chat" },
  { href: "/constellation", label: "✨ Constellation" },
  { href: "/quests", label: "🎯 Quests" },
  { href: "/profile", label: "👤 Profile" },
  { href: "/settings", label: "⚙️ Settings" }
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="flex flex-col bg-[var(--sidebar-bg)] p-4 text-white">
        <div className="mb-5">
          <p className="text-xl font-bold tracking-tight">{APP_NAME}</p>
          <p className="mt-0.5 text-xs text-white/50">{user.displayName}</p>
        </div>

        <div className="mb-4">
          <SearchBar placeholder="Search…" />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-white/20 font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          onClick={() => { clearAuth(); router.push("/login"); }}
        >
          Sign out
        </button>
      </aside>

      {/* Main content with error boundary */}
      <main className="min-h-screen overflow-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
