import type { MetadataRoute } from "next";

// Convención de fichero del App Router: Next.js genera /robots.txt a partir
// de esto en el build (no hace falta un fichero estático en public/).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://desafio-picota.vercel.app/sitemap.xml",
  };
}
