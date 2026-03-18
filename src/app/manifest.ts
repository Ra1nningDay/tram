import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BU Tram Tracker",
    short_name: "BU Tram",
    description: "Public real-time shuttle tracking map for BU campus.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#fe5050",
    lang: "th",
    categories: ["navigation", "travel", "education"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
