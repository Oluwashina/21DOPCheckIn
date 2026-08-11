import type { Metadata, Viewport } from "next";

import "./globals.css";
import {
  CHURCH_NAME,
  PROGRAM_DATE_RANGE,
  PROGRAM_NAME,
  PROGRAM_THEME,
} from "@/lib/program";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: `${PROGRAM_NAME}: ${PROGRAM_THEME} — ${CHURCH_NAME}`,
  description: `Check in, stay accountable and track your ${PROGRAM_NAME} journey with your service team. ${PROGRAM_DATE_RANGE}.`,
  openGraph: {
    title: `${PROGRAM_NAME}: ${PROGRAM_THEME}`,
    description: `${CHURCH_NAME} · ${PROGRAM_DATE_RANGE}`,
    images: ["/21-days-of-power-flyer.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#08040e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
