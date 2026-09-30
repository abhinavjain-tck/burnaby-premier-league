import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Barlow Condensed for headings and big numbers (sporty, fits long names on a phone).
// Barlow for body: same family, plain and very readable.
const heading = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading", display: "swap" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Burnaby Premier League", template: "%s · BPL" },
  description: "BPL Season 4: player registration and auction on Sunday 4 Oct 2026.",
};

export const viewport: Viewport = { themeColor: "#0b4d2c" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
