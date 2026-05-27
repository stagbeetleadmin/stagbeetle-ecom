/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Resizes the image to not exceed maxWidth, and compresses it using JPEG quality.
 */
export const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
  // If the file is not an image, return it as-is
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Also if it is a GIF/SVG, we shouldn't compress it to JPEG as it might lose transparency/animation
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions preserving aspect ratio
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn("[Image Compressor] Canvas 2d context not available, returning original file.");
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`[Image Compressor] Compressed ${file.name} from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB`);
              resolve(compressedFile);
            } else {
              console.warn("[Image Compressor] Blob generation failed, returning original file.");
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = (err) => {
        console.warn("[Image Compressor] Image load error, returning original file.", err);
        resolve(file);
      };
    };

    reader.onerror = (err) => {
      console.warn("[Image Compressor] FileReader error, returning original file.", err);
      resolve(file);
    };
  });
};
