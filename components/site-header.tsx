"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/order", label: "Order Lunch" },
  { href: "/account", label: "My Account" },
  { href: "/admin/login", label: "Admin" }
];

function LbbLogoMark() {
  return (
    <svg viewBox="0 0 320 320" aria-hidden="true" className="h-full w-full">
      <rect width="320" height="320" rx="36" fill="#D90A17" />
      <path d="M70 52C110 42 210 40 250 51C262 55 269 63 272 72C259 59 239 55 216 56H106C90 56 78 59 70 65V52Z" fill="white" />
      <path d="M70 268C110 278 210 280 250 269C262 265 269 257 272 248C259 261 239 265 216 264H106C90 264 78 261 70 255V268Z" fill="white" />
      <text
        x="160"
        y="120"
        textAnchor="middle"
        fill="white"
        fontSize="74"
        fontWeight="800"
        fontFamily="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
        letterSpacing="3"
      >
        LOCAL
      </text>
      <text
        x="160"
        y="182"
        textAnchor="middle"
        fill="white"
        fontSize="68"
        fontWeight="700"
        fontStyle="italic"
        fontFamily="'Brush Script MT', 'Segoe Script', cursive"
      >
        Bigger
      </text>
      <text
        x="160"
        y="248"
        textAnchor="middle"
        fill="white"
        fontSize="74"
        fontWeight="800"
        fontFamily="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
        letterSpacing="3"
      >
        BURGER
      </text>
    </svg>
  );
}

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="container-app flex items-center justify-between gap-4 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setIsOpen(false)}>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-rose-200/70 shadow-sm sm:h-14 sm:w-14">
            <LbbLogoMark />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Local Bigger Burger</p>
            <p className="truncate text-base font-semibold text-ink sm:text-lg">Medina Academy Hot Lunch Preorders</p>
          </div>
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
