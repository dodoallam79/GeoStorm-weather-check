import type { ReactNode } from "react";

export const metadata = { title: "Weather GO/NO-GO" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial", padding: 20 }}>{children}</body>
    </html>
  );
}
