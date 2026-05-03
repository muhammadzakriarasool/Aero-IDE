import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Aero IDE",
    template: "%s | Aero IDE",
  },
  description:
    "A browser-based IDE powered by WebContainers — write, preview, and ship code without leaving your browser.",
  keywords: ["IDE", "WebContainer", "browser IDE", "code editor", "Aero IDE"],
  authors: [{ name: "Aero IDE" }],
  robots: { index: false, follow: false }, // Private tool — no indexing
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a14" },
    { media: "(prefers-color-scheme: light)", color: "#f8f8fc" },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html
      lang="en"
      // 'dark' class is set permanently — Aero IDE is dark-first.
      // To enable system/light toggle, swap to a ThemeProvider in Phase 2.
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
