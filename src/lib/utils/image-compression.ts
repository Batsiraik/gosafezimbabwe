/**
 * Compress an image file to reduce its size
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @param maxSizeMB - Maximum file size in MB (default: 2)
 * @returns Compressed File object
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8,
  maxSizeMB: number = 2,
  attempt: number = 0
): Promise<File> {
  // Safety check to prevent infinite recursion
  if (attempt > 5) {
    throw new Error('Unable to compress image to required size after multiple attempts');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with quality settings
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Check if compressed size is acceptable
            const sizeMB = blob.size / (1024 * 1024);
            
            if (sizeMB <= maxSizeMB) {
              // Create new File from blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // If still too large, compress more aggressively
              if (quality > 0.5) {
                // Try with lower quality
                compressImage(file, maxWidth, maxHeight, quality - 0.1, maxSizeMB, attempt + 1)
                  .then(resolve)
                  .catch(reject);
              } else if (maxWidth > 800) {
                // If quality is already low, reduce dimensions (but not below 800px)
                compressImage(file, maxWidth * 0.9, maxHeight * 0.9, 0.7, maxSizeMB, attempt + 1)
                  .then(resolve)
                  .catch(reject);
              } else {
                // If we've tried everything, accept the current size (it's the best we can do)
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}
