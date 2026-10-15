import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/app/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "FERNOTECH ECO-TRACK",
  description:
    "Suivez la collecte, la transformation et la vente de plastique recyclé.",
  applicationName: "FERNOTECH ECO-TRACK",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ECO-TRACK",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#286542",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
