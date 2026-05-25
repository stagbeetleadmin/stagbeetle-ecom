import { MetadataRoute } from 'next';
import { getProducts, Product } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stagbeetle.co.in';

  let products: Product[] = [];
  try {
    products = await getProducts();
  } catch (e) {
    console.error("Sitemap generation failed to query products:", e);
  }

  const productUrls = products.map((product) => ({
    url: `${baseUrl}/product/${product.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0
    },
    ...productUrls
  ];
}
