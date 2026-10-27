import type { Metadata } from "next";
import { Merriweather, Inter } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";

const heading = Merriweather({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Needed so share previews (WhatsApp, Facebook) get absolute image links.
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: "Berea International SDA Church",
  description:
    "Welcome to Berea International Seventh-day Adventist Church — join us for worship, ministry, and community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
