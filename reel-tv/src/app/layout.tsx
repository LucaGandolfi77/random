import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/shared/QueryProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "REELTV - Buy Airtime. Broadcast Your Reel.",
    template: "%s | REELTV",
  },
  description:
    "The platform where creators buy broadcasting time for their Reels on topic-dedicated channels. YouTube meets TikTok meets TV.",
  keywords: ["video", "broadcast", "reels", "channels", "streaming", "creator"],
  authors: [{ name: "REELTV" }],
  creator: "REELTV",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "REELTV",
    title: "REELTV - Buy Airtime. Broadcast Your Reel.",
    description: "The platform where creators buy broadcasting time for their Reels.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "REELTV - Buy Airtime. Broadcast Your Reel.",
    description: "The platform where creators buy broadcasting time for their Reels.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <QueryProvider>
              {children}
            </QueryProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
