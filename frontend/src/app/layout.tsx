import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Poppins } from "next/font/google";
import type { ReactNode } from "react";

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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${poppins.variable} ${ibmPlexSansThai.variable}`}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
