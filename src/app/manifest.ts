import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FERNOTECH ECO-TRACK",
    short_name: "ECO-TRACK",
    description: "Suivi de la collecte, production et vente de balais recyclés.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f4",
    theme_color: "#286542",
    lang: "fr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
