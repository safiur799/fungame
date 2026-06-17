import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Daily Number Draw",
    template: "%s | Daily Number Draw"
  },
  description:
    "Daily Number Draw is a fun number picker and public result board with live countdowns and 0 to 10000 results.",
  keywords: ["number draw", "daily draw", "lucky number", "fun game", "number picker"],
  openGraph: {
    title: "Daily Number Draw",
    description: "Pick a number, watch the countdown, and compare it with the daily result.",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080a12"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
