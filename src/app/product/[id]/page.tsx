import React from 'react';
import { Metadata } from 'next';
import { getProductById, getSuggestions, getProducts, getSkuBase, Product } from '@/lib/db';
import ProductDetailClient from './ProductDetailClient';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  // A connection failure here should still render the page with generic
  // metadata rather than crashing metadata generation itself.
  const product = await getProductById(id).catch(() => null);

  if (!product) {
    return {
      title: 'Garment Specification Not Found | STAGBEETLE',
      description: 'The requested garment specifications could not be retrieved from the atelier collection.'
    };
  }

  return {
    title: `${product.title} - One Of A Kind | STAGBEETLE`,
    description: product.description,
    openGraph: {
      type: 'website',
      title: `${product.title} | STAGBEETLE India`,
      description: product.description,
      url: `https://stagbeetle.co.in/product/${product.id}`,
      images: [
        {
          url: product.images[0],
          alt: product.title,
          width: 800,
          height: 1067
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} | STAGBEETLE`,
      description: product.description,
      images: [product.images[0]]
    }
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // getProductById throws only on a genuine connection/timeout failure —
  // it resolves to `null` when the product simply doesn't exist. Those two
  // cases need different pages: a dead link is a 404, a slow/dropped
  // connection to Supabase is not, and treating it as one would tell a
  // shopper a real product "doesn't exist" just because their network hiccuped.
  let product;
  try {
    product = await getProductById(id);
  } catch {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 py-24 text-center">
          <div className="max-w-[440px]">
            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-4">wifi_off</span>
            <h1 className="text-[16px] font-bold text-gray-900 uppercase tracking-wide mb-2">Couldn&apos;t Load This Garment</h1>
            <p className="text-[13px] text-gray-500 mb-6">We&apos;re having trouble reaching the catalog. Please check your connection and reload the page.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  // Colour variants and "you may also like" are secondary — if either fails
  // to load, the product itself should still render rather than error out.
  const [allProducts, suggestions] = await Promise.all([
    getProducts().catch(() => [] as Product[]),
    getSuggestions([product.id]).catch(() => [] as Product[]),
  ]);

  const skuBase = getSkuBase(product.sku);
  const colorVariants = skuBase
    ? allProducts.filter(p => p.id !== product.id && getSkuBase(p.sku) === skuBase)
    : [];

  return (
    <ProductDetailClient
      product={product}
      initialSuggestions={suggestions}
      colorVariants={colorVariants}
    />
  );
}

