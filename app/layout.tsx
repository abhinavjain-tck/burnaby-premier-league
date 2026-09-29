import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Burnaby Premier League", template: "%s · BPL" },
  description: "BPL Season 4: player registration and auction on Sunday 4 Oct 2026.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
