//layout.js file

import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "./components/ThemeProvider";
import { FloatingCursor } from "./components/FloatingCursor";
import { Navigation } from "./components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Edinception - Fashion Designer Measurement App",
  description:
    "Professional measurement tracking app for fashion designers. Store, manage, and access client measurements anywhere.",
  keywords:
    "fashion designer, measurements, tailoring, client management, fashion app",
  authors: [{ name: "Edinception" }],
  creator: "Edinception",
  publisher: "Edinception",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://edinception.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Edinception - Fashion Designer Measurement App",
    description: "Professional measurement tracking app for fashion designers.",
    url: "https://edinception.com",
    siteName: "Edinception",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Edinception Fashion Designer App",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Edinception - Fashion Designer Measurement App",
    description: "Professional measurement tracking app for fashion designers.",
    creator: "@edinception",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <FloatingCursor />
          <Navigation />
          <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
