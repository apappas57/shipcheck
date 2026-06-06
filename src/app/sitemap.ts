import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://shipcheck.vercel.app",
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
