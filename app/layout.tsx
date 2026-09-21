import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Christmas gifts 2026 · The gift watchlist",
  description: "Find thoughtful gifts, compare offers, and watch for a better price before Black Friday.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
