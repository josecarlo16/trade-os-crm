/**
 * Compresses an image file using canvas API
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @param quality - JPEG/WebP quality 0-1 (default: 0.85)
 * @returns Compressed file blob with original filename
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
  } = {}
): Promise<File> {
  const { 
    maxWidth = 1920, 
    maxHeight = 1920, 
    quality = 0.85,
    maxSizeMB = 2 // Target max size after compression
  } = options;

  // Skip compression for GIFs (they lose animation) and small files
  if (file.type === 'image/gif' || file.size < 100 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          resolve(file);
          return;
        }

        // Use white background for JPEGs (they don't support transparency)
        if (file.type === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output format - prefer WebP for best compression
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        
        // Start with initial quality and reduce if needed
        let currentQuality = quality;
        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }

              // If still too large and quality can be reduced, try again
              if (blob.size > maxSizeMB * 1024 * 1024 && currentQuality > 0.5) {
                currentQuality -= 0.1;
                compress();
                return;
              }

              // Create new file with original name
              const compressedFile = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              });

              // Only use compressed version if it's actually smaller
              if (compressedFile.size < file.size) {
                console.log(
                  `Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
                );
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            outputType,
            currentQuality
          );
        };

        compress();
      } catch (error) {
        console.error('Compression error:', error);
        resolve(file); // Return original on error
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for compression');
      resolve(file); // Return original on error
    };

    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compresses multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options?: Parameters<typeof compressImage>[1]
): Promise<File[]> {
  return Promise.all(files.map(file => compressImage(file, options)));
}
