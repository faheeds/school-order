import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Medina Academy Hot Lunch Preorders",
  description: "Hot lunch ordering for Medina Academy by Local Bigger Burger."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-paper">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
