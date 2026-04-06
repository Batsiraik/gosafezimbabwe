import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Compress image from URI to JPEG data URL under maxBytes.
 * Accepts any image format. Tries progressively smaller dimensions and lower quality.
 */
export async function compressImageToDataUrl(
  uri: string,
  maxBytes: number = DEFAULT_MAX_BYTES
): Promise<string | null> {
  const attempts: Array<{ width: number; compress: number }> = [
    { width: 1200, compress: 0.8 },
    { width: 1000, compress: 0.6 },
    { width: 800, compress: 0.5 },
    { width: 600, compress: 0.4 },
  ];
  for (const { width, compress } of attempts) {
    try {
      const result = await manipulateAsync(
        uri,
        [{ resize: { width } }],
        { compress, format: SaveFormat.JPEG, base64: true }
      );
      if (!result.base64) continue;
      const sizeBytes = (result.base64.length * 3) / 4;
      if (sizeBytes <= maxBytes) {
        return `data:image/jpeg;base64,${result.base64}`;
      }
    } catch (_) {
      continue;
    }
  }
  return null;
}
