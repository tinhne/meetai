import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://meetai-assitant.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'], // prevent crawlers from hitting API routes
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
