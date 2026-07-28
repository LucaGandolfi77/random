import type { Metadata } from "next";
import "./globals.css";
import "@/lib/prisma"; // warm up the connection

export const metadata: Metadata = {
  title: "ReelBoost — pay to be famous",
  description: "Watch reels & shorts. Creators boost videos to go viral.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}