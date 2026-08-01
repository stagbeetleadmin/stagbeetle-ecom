import React from 'react';

interface PriceDisplayProps {
  price: number; // Selling Price
  mrp?: number; // Maximum Retail Price
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: { price: 'text-[13px] font-bold', mrp: 'text-[11px]', badge: 'text-[9px] px-1.5 py-0.5' },
  md: { price: 'text-[18px] font-bold', mrp: 'text-[13px]', badge: 'text-[10px] px-2 py-0.5' },
  lg: { price: 'text-[26px] font-bold', mrp: 'text-[15px]', badge: 'text-[11px] px-2.5 py-1' },
};

// Reused on product cards, product detail, and the admin Preview modal so the
// discount math and formatting can't drift between customer surfaces.
export default function PriceDisplay({ price, mrp, size = 'md', className = '' }: PriceDisplayProps) {
  const classes = SIZE_CLASSES[size];
  const hasDiscount = !!mrp && mrp > price;
  const discountPct = hasDiscount ? Math.round(((mrp! - price) / mrp!) * 100) : 0;

  return (
    <div className={`flex items-baseline gap-2 flex-wrap ${className}`}>
      <span className={`${classes.price} text-gray-900`}>₹{price.toLocaleString('en-IN')}</span>
      {hasDiscount && (
        <>
          <span className={`${classes.mrp} text-gray-400 line-through`}>₹{mrp!.toLocaleString('en-IN')}</span>
          <span className={`${classes.badge} font-bold text-green-700 bg-green-50 border border-green-200 rounded-sm uppercase tracking-wide`}>
            {discountPct}% OFF
          </span>
        </>
      )}
    </div>
  );
}
