import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@nitro-bio/sequence-viewers/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sequence Viewer · Next.js App Router",
  description: "A controlled sequence viewer with self-hosted alignment assets",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
