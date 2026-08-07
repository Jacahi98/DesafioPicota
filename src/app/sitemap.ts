import type { MetadataRoute } from "next";

// Una sola página (todo el contenido vive en / con anclas), así que el
// sitemap tiene una única entrada. Si algún día hay rutas reales, se añaden
// aquí.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://desafio-picota.vercel.app",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
