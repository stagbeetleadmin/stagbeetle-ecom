import React from 'react';
import { Metadata } from 'next';
import { getProductById, getSuggestions } from '@/lib/db';
import ProductDetailClient from './ProductDetailClient';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const product = await getProductById(id);

  if (!product) {
    return {
      title: 'Garment Specification Not Found | Stag Beetle',
      description: 'The requested garment specifications could not be retrieved from the atelier collection.'
    };
  }

  return {
    title: `${product.title} - The Anatomy of Elegance | Stag Beetle`,
    description: product.description,
    openGraph: {
      type: 'website',
      title: `${product.title} | Stag Beetle India`,
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
      title: `${product.title} | Stag Beetle`,
      description: product.description,
      images: [product.images[0]]
    }
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const suggestions = await getSuggestions([product.id]);

  return (
    <ProductDetailClient product={product} initialSuggestions={suggestions} />
  );
}
