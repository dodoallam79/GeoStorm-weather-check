import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weather Criteria Checker",
  description: "StormGeo Forecast Analyzer",
  viewport: "width=device-width, initial-scale=1.0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Helps match the original “dark” rendering behavior */}
        <meta name="color-scheme" content="dark" />
      </head>
      <body>{children}</body>
    </html>
  );
}
