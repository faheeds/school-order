import Link from "next/link";
import { signOut } from "@/lib/auth";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/schools", label: "Schools" },
  { href: "/admin/delivery-dates", label: "Delivery Dates" }
];

export function AdminNav() {
  return (
    <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-brand-50">
            {link.label}
          </Link>
        ))}
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
      >
        <button type="submit" className="rounded-full border border-slate-200 px-4 py-2 text-sm">
          Sign out
        </button>
      </form>
    </div>
  );
}
