"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/order", label: "Order Lunch" },
  { href: "/account", label: "My Account" },
  { href: "/admin/login", label: "Admin" }
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="container-app flex items-center justify-between gap-4 py-4">
        <Link href="/" className="min-w-0" onClick={() => setIsOpen(false)}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Local Bigger Burger</p>
          <p className="truncate text-base font-semibold text-ink sm:text-lg">Medina Academy Hot Lunch Preorders</p>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-ink shadow-sm transition hover:border-brand-300 hover:text-brand-700"
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-slate-200/70 bg-white transition-[max-height,opacity] duration-200",
          isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="container-app flex flex-col gap-2 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm font-medium transition",
                pathname === item.href ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50 hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
