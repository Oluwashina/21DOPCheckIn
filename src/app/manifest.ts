import type { MetadataRoute } from "next";

import { CHURCH_NAME, PROGRAM_NAME, PROGRAM_THEME } from "@/lib/program";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PROGRAM_NAME}: ${PROGRAM_THEME}`,
    short_name: PROGRAM_NAME,
    description: `Check in and stay accountable with your service team at ${CHURCH_NAME}.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: "/the-new-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/the-new-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/the-new-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
