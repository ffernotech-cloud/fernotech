import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FERNOTECH ECO-TRACK",
  description:
    "Suivez la collecte, la transformation et la vente de plastique recyclé.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
