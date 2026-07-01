import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "1-12 Number Game",
    template: "%s | 1-12 Number Game"
  },
  description: "5-minute 1-12 number game with RBAC users, wallet, and lowest-total winning result.",
  keywords: ["number game", "5 minute draw", "rbac game"],
  openGraph: {
    title: "1-12 Number Game",
    description: "Pick numbers 1 to 12 and check the 5-minute lowest-total result.",
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
