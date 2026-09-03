"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Building2,
  LayoutDashboard,
  Layers,
  RotateCcw,
  ScrollText,
  Search,
  LogOut,
} from "lucide-react";

import { Badge, Button, cx } from "@/components/ui";
import { useVault } from "@/store/vault-store";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/search", label: "Search", icon: Search },
  { href: "/audit", label: "Audit trail", icon: ScrollText },
];

const ROLE_TONE = {
  owner: "brand",
  lawyer: "graph",
  buyer: "verified",
} as const;

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, hydrated, signOut, resetDemo } = useVault();
  const pathname = usePathname();
  const router = useRouter();

  // Gate the shell on an active session. Waiting for hydration avoids bouncing
  // a signed-in user out on a hard reload.
  useEffect(() => {
    if (hydrated && !currentUser) router.replace("/");
  }, [hydrated, currentUser, router]);

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs text-ink-500">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-ink-700 bg-ink-900">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
            <Layers size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight">
              Real Estate Vault
            </p>
            <p className="text-[10px] text-ink-500">Property intelligence</p>
          </div>
        </div>

        <nav className="flex-1 px-3">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-ink-800 font-medium text-ink-100"
                    : "text-ink-400 hover:bg-ink-850 hover:text-ink-200",
                )}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-700 p-4">
          <div className="mb-3">
            <p className="truncate text-[13px] font-medium text-ink-100">
              {currentUser.name}
            </p>
            <div className="mt-1.5">
              <Badge tone={ROLE_TONE[currentUser.role]}>
                {currentUser.role}
              </Badge>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-500">
              {currentUser.organisation}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                signOut();
                router.push("/");
              }}
              title="Return to the role picker"
            >
              <LogOut size={13} />
              Exit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                resetDemo();
                router.push("/");
              }}
              title="Discard everything and restore the seeded state"
            >
              <RotateCcw size={13} />
              Reset
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
