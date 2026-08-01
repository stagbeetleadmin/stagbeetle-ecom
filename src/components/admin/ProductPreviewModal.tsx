"use client";

import React from 'react';
import { Product, getColorHex, getColorName } from '@/lib/db';
import ProductGallery from '@/components/ProductGallery';
import PriceDisplay from '@/components/PriceDisplay';
import RichText from '@/components/RichText';

interface ProductPreviewModalProps {
  product: Product;
  onClose: () => void;
}

// Renders the in-progress garment form with the exact same components the
// live product page uses (ProductGallery, PriceDisplay, RichText), so what
// the admin sees here is what customers will see — without touching the database.
export default function ProductPreviewModal({ product, onClose }: ProductPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0D1B2A] text-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-gold-leaf">visibility</span>
          <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest">Customer Preview — Not Saved</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest hover:text-gold-leaf transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          Close Preview
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        <div className="px-4 md:px-10 py-6 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <ProductGallery images={product.images} title={product.title || 'Garment preview'} />

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] text-[#C5A059] uppercase mb-1">
                  {product.category} Collection
                </p>
                <h1 className="text-[28px] md:text-[32px] font-bold text-gray-900 leading-tight mb-3">
                  {product.title || 'Untitled Garment'}
                </h1>
                <PriceDisplay price={product.price} mrp={product.mrp} size="lg" />
                {product.material && (
                  <p className="text-[12px] text-gray-500 mt-2">
                    Material: <span className="font-semibold text-gray-700">{product.material}</span>
                  </p>
                )}
                {product.sku && (
                  <p className="text-[12px] text-gray-500 mt-1">
                    SKU: <span className="font-semibold text-gray-700 uppercase">{product.sku}</span>
                  </p>
                )}
                {product.sleeve_type && (
                  <p className="text-[12px] text-gray-500 mt-1">
                    Sleeves: <span className="font-semibold text-gray-700">{product.sleeve_type}</span>
                  </p>
                )}
              </div>

              {product.description && (
                <div className="border-t border-gray-100 pt-4">
                  <RichText html={product.description} className="text-[13px] text-gray-600 leading-relaxed" />
                </div>
              )}

              {product.sizes.length > 0 && product.sizes[0] !== 'One Size' && (
                <div className="border-t border-gray-100 pt-4">
                  <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase block mb-2">Size</span>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(size => (
                      <span key={size} className="px-4 py-2 text-[12px] font-bold border border-gray-200 text-gray-700 bg-white">
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.colors.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase block mb-2">Color</span>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map(color => (
                      <span
                        key={color}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] border border-gray-200 text-gray-600 bg-white"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-gray-200/50 shrink-0"
                          style={{ backgroundColor: getColorHex(color) }}
                        />
                        {getColorName(color)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled
                className="w-full bg-[#0D1B2A] text-white py-3.5 text-[11px] font-bold tracking-[0.25em] uppercase opacity-50 cursor-not-allowed"
              >
                Add to Bag (Preview Mode)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
