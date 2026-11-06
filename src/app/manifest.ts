import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FERNOTECH ECO-TRACK",
    short_name: "ECO-TRACK",
    description: "Suivi de la collecte, production et vente de balais recyclés.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#0b428a",
    lang: "fr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/fernotech-logo.png",
        sizes: "768x768",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
