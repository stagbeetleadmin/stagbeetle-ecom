"use client";

import React, { useRef, useState } from 'react';

interface ImageUploadGridProps {
  images: string[];
  onChange: (images: string[]) => void;
  onUploadFile: (file: File, slotIndex: number) => Promise<string | null>;
  onRemoveFile?: (url: string) => Promise<void> | void;
  disabled?: boolean;
  disabledReason?: string;
  maxImages?: number;
}

// Generic image slot grid used by the admin garment form. Storage/compression
// concerns stay with the caller (onUploadFile/onRemoveFile) — this component
// only owns slot layout, drag-drop reordering, and upload/remove UI state.
export default function ImageUploadGrid({
  images,
  onChange,
  onUploadFile,
  onRemoveFile,
  disabled = false,
  disabledReason,
  maxImages = 6,
}: ImageUploadGridProps) {
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const slots = Array.from({ length: maxImages });

  const handleFiles = async (files: FileList | File[], slotIndex: number) => {
    if (disabled) return;
    const file = Array.from(files)[0];
    if (!file || !file.type.startsWith('image/')) return;

    setUploadingSlot(slotIndex);
    try {
      const url = await onUploadFile(file, slotIndex);
      if (url) {
        const next = [...images];
        if (slotIndex < next.length) {
          next[slotIndex] = url;
        } else {
          next.push(url);
        }
        onChange(next);
      }
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemove = async (idx: number) => {
    const url = images[idx];
    if (!url) return;
    if (onRemoveFile) await onRemoveFile(url);
    onChange(images.filter((_, i) => i !== idx));
  };

  // Native HTML5 drag-and-drop — no library needed for reordering
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverSlot = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(idx);
  };

  const handleDropOnSlot = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(null);

    // Reordering an existing image within the grid
    if (dragIndexRef.current !== null && dragIndexRef.current !== idx && dragIndexRef.current < images.length) {
      const next = [...images];
      const [moved] = next.splice(dragIndexRef.current, 1);
      next.splice(Math.min(idx, next.length), 0, moved);
      onChange(next);
      dragIndexRef.current = null;
      return;
    }
    dragIndexRef.current = null;

    // Dropping a new file from the OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files, idx);
    }
  };

  return (
    <div className="space-y-2">
      {disabled && disabledReason && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">{disabledReason}</p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {slots.map((_, idx) => {
          const url = images[idx];
          const isUploading = uploadingSlot === idx;
          const isDragOver = dragOverSlot === idx;
          const isNextSlot = idx === images.length;

          if (url) {
            return (
              <div
                key={idx}
                draggable
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOverSlot(idx)}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={handleDropOnSlot(idx)}
                className={`relative aspect-[3/4] border rounded-sm overflow-hidden bg-white cursor-move group ${
                  isDragOver ? 'border-gold-leaf ring-2 ring-gold-leaf/40' : 'border-zinc-200'
                }`}
              >
                <img src={url} alt={`Garment image ${idx + 1}`} className="w-full h-full object-contain" />
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-[#0D1B2A] text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  &times;
                </button>
                <span className="absolute bottom-1 right-1 material-symbols-outlined text-[14px] text-white/80 bg-black/30 rounded-sm px-0.5">
                  drag_indicator
                </span>
                {isUploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="animate-spin border-2 border-gold-leaf border-t-transparent w-5 h-5 rounded-full" />
                  </div>
                )}
              </div>
            );
          }

          return (
            <label
              key={idx}
              onDragOver={isNextSlot ? handleDragOverSlot(idx) : undefined}
              onDragLeave={isNextSlot ? () => setDragOverSlot(null) : undefined}
              onDrop={isNextSlot ? handleDropOnSlot(idx) : undefined}
              className={`relative aspect-[3/4] border border-dashed rounded-sm flex flex-col items-center justify-center gap-1 text-zinc-400 transition-colors ${
                disabled || !isNextSlot ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-gold-leaf hover:text-gold-leaf bg-zinc-50/50'
              } ${isDragOver ? 'border-gold-leaf ring-2 ring-gold-leaf/40 text-gold-leaf' : 'border-zinc-200'}`}
            >
              {isUploading ? (
                <span className="animate-spin border-2 border-gold-leaf border-t-transparent w-5 h-5 rounded-full" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-center px-1">
                    {idx === 0 ? 'Main Image' : `Slot ${idx + 1}`}
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={disabled || !isNextSlot}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFiles(e.target.files, idx);
                  e.target.value = '';
                }}
              />
            </label>
          );
        })}
      </div>
      <p className="text-[10px] text-zinc-400">
        Drag images to reorder — the first image is used as the main product photo. {images.length}/{maxImages} uploaded.
      </p>
    </div>
  );
}
