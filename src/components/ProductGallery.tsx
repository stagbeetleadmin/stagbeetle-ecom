"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';

// NOTE: pass `key={product.id}` (or similar) from the parent when the image
// set can change under an already-mounted gallery — e.g. navigating between
// product pages. That remounts this component with fresh state instead of
// needing an effect to reset activeIndex on prop change.

const ZOOM_LEVEL = 2.4;
const SWIPE_THRESHOLD = 40; // px
const TAP_MAX_DIST = 10; // px
const TAP_MAX_TIME = 400; // ms

interface ProductGalleryProps {
  images: string[];
  title: string;
  className?: string;
}

// Shared by the customer product page and the admin Preview modal, so both
// render the gallery identically. Desktop: cursor-follow zoom via a direct
// CSS transform on the image (imperative style writes on mousemove — no
// setState per frame, so there's no re-render lag). Mobile: tap to zoom,
// drag-while-zoomed to pan, swipe to change image.
export default function ProductGallery({ images, title, className = '' }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const hasImages = images && images.length > 0;
  const safeIndex = hasImages ? Math.min(activeIndex, images.length - 1) : 0;

  const resetZoom = useCallback(() => {
    setIsZoomed(false);
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1)';
      imgRef.current.style.transformOrigin = 'center center';
    }
  }, []);

  const goTo = useCallback((idx: number) => {
    if (!hasImages) return;
    const next = ((idx % images.length) + images.length) % images.length;
    setActiveIndex(next);
    resetZoom();
  }, [images, hasImages, resetZoom]);

  // Keyboard navigation (left/right arrows) — ignored while typing elsewhere on the page
  useEffect(() => {
    if (!hasImages || images.length < 2) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'ArrowLeft') goTo(safeIndex - 1);
      if (e.key === 'ArrowRight') goTo(safeIndex + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goTo, safeIndex, hasImages, images.length]);

  // Desktop: zoom follows the cursor
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    imgRef.current.style.transformOrigin = `${xPct}% ${yPct}%`;
    imgRef.current.style.transform = `scale(${ZOOM_LEVEL})`;
  };

  // Touch: swipe between images, tap to zoom, drag-while-zoomed to pan
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isZoomed || !imgRef.current || !containerRef.current) return;
    const t = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((t.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((t.clientY - rect.top) / rect.height) * 100));
    imgRef.current.style.transformOrigin = `${xPct}% ${yPct}%`;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dist = Math.hypot(dx, dy);
    const isTap = dist < TAP_MAX_DIST && Date.now() - start.time < TAP_MAX_TIME;

    if (isZoomed) {
      if (isTap) resetZoom();
      return;
    }

    if (isTap) {
      if (!containerRef.current || !imgRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xPct = ((t.clientX - rect.left) / rect.width) * 100;
      const yPct = ((t.clientY - rect.top) / rect.height) * 100;
      imgRef.current.style.transformOrigin = `${xPct}% ${yPct}%`;
      imgRef.current.style.transform = `scale(${ZOOM_LEVEL})`;
      setIsZoomed(true);
      return;
    }

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      goTo(dx < 0 ? safeIndex + 1 : safeIndex - 1);
    }
  };

  if (!hasImages) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-50 text-gray-400 aspect-[3/4] ${className}`}>
        <span className="material-symbols-outlined text-[48px] text-gray-300 mb-2">image</span>
        <span className="text-[13px] font-label-caps tracking-wider">No Image Available</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main image — full width of its block at every screen size; thumbnails live below, not beside it */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-gray-50 border border-gray-100 select-none shadow-sm"
        style={{ aspectRatio: '3 / 4', cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetZoom}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          key={safeIndex}
          ref={imgRef}
          src={images[safeIndex]}
          alt={title}
          fetchPriority={safeIndex === 0 ? 'high' : undefined}
          loading={safeIndex === 0 ? 'eager' : 'lazy'}
          draggable={false}
          className="w-full h-full object-contain gallery-fade-in"
          style={{ transform: 'scale(1)', transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goTo(safeIndex - 1); }}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white flex items-center justify-center rounded-full shadow-md text-gray-700 hover:text-[#C5A059] transition-all hover:scale-105"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goTo(safeIndex + 1); }}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white flex items-center justify-center rounded-full shadow-md text-gray-700 hover:text-[#C5A059] transition-all hover:scale-105"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
            <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
              {safeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails — a single row below the main image, same layout on mobile and desktop */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-0.5">
          {images.map((img, idx) => {
            const isActive = safeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => goTo(idx)}
                aria-label={`View image ${idx + 1}`}
                aria-current={isActive}
                className={`relative w-16 h-20 sm:w-[72px] sm:h-[92px] shrink-0 overflow-hidden bg-gray-50 border-2 flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'border-[#C5A059] shadow-sm'
                    : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-200'
                }`}
              >
                <img src={img} alt={`${title} view ${idx + 1}`} loading="lazy" className="w-full h-full object-contain" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
