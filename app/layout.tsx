import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Lunch Preorders",
  description: "Parent ordering and restaurant admin dashboard for school lunch delivery."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
