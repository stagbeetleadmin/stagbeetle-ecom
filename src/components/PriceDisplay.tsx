import React from 'react';

interface PriceDisplayProps {
  price: number; // Selling Price
  mrp?: number; // Maximum Retail Price
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: { price: 'text-[13px] font-bold', mrp: 'text-[11px]', discount: 'text-[11px]' },
  md: { price: 'text-[18px] font-bold', mrp: 'text-[13px]', discount: 'text-[13px]' },
  lg: { price: 'text-[26px] font-bold', mrp: 'text-[15px]', discount: 'text-[15px]' },
};

// Reused on product cards, product detail, and the admin Preview modal so the
// discount math and formatting can't drift between customer surfaces.
// Discount % uses the vivid red-orange convention shoppers already read as
// "savings" from Myntra/Ajio/Amazon, rather than the site's gold/charcoal palette.
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
          <span className={`${classes.discount} font-bold text-[#E4443D]`}>
            {discountPct}% OFF
          </span>
        </>
      )}
    </div>
  );
}
