import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://gameprogress.app";
  return [
    { url: `${base}/landing`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/cgu`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/rgpd`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/mentions-legales`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
