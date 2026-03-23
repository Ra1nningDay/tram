import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Poppins } from "next/font/google";
import type { ReactNode } from "react";

import { PwaRegistrar } from "@/components/PwaRegistrar";
import { getMetadataBase } from "@/lib/config";

import { AppProviders } from "./providers";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BU Tram Tracker",
  description: "Public real-time shuttle tracking map for BU campus.",
  applicationName: "BU Tram Tracker",
  metadataBase: getMetadataBase(),
  manifest: "/manifest.webmanifest",
  keywords: ["tram", "bus", "tracker", "campus", "Bangkok University"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BU Tram",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon-192x192.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fe5050" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${poppins.variable} ${ibmPlexSansThai.variable}`}
    >
      <body>
        <PwaRegistrar />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
