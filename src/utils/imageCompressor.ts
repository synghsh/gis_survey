import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB hard limit

/**
 * Gets approximate or exact byte size of a file URI.
 */
export async function getFileSizeBytes(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch (err) {
    console.warn('[ImageCompressor] Could not get file size via blob:', err);
    return 0;
  }
}

/**
 * Compresses an image if it's large or high-resolution, ensuring it is under maxSizeBytes (default 5MB).
 *
 * @param uri Local file URI (file://...)
 * @param maxSizeBytes Maximum file size in bytes (default 5 MB)
 * @returns Compressed local file URI
 */
export async function compressImageIfNeeded(
  uri: string,
  maxSizeBytes: number = MAX_IMAGE_BYTES
): Promise<string> {
  if (!uri || (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('ph://'))) {
    return uri;
  }

  try {
    const initialSize = await getFileSizeBytes(uri);
    console.log(`[ImageCompressor] Initial size of ${uri.split('/').pop()}: ${(initialSize / 1024 / 1024).toFixed(2)} MB`);

    // Pass 1: Standard high-quality resize (max dimension 1600px, 75% quality)
    // This typically brings an 8-15MB phone camera image down to ~400KB - 900KB while preserving excellent visual clarity.
    let result = await manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.75, format: SaveFormat.JPEG }
    );

    let currentSize = await getFileSizeBytes(result.uri);
    console.log(`[ImageCompressor] Pass 1 size: ${(currentSize / 1024 / 1024).toFixed(2)} MB`);

    // Pass 2: If somehow still exceeds max limit (e.g. 5MB), scale down further
    if (currentSize > maxSizeBytes) {
      console.log('[ImageCompressor] Still exceeds limit, applying Pass 2 aggressive compression...');
      result = await manipulateAsync(
        result.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.55, format: SaveFormat.JPEG }
      );
      currentSize = await getFileSizeBytes(result.uri);
      console.log(`[ImageCompressor] Pass 2 size: ${(currentSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Pass 3: Hard failsafe if still > 5MB
    if (currentSize > maxSizeBytes) {
      console.log('[ImageCompressor] Pass 3 failsafe compression...');
      result = await manipulateAsync(
        result.uri,
        [{ resize: { width: 960 } }],
        { compress: 0.4, format: SaveFormat.JPEG }
      );
    }

    return result.uri;
  } catch (error) {
    console.warn('[ImageCompressor] Error during compression, falling back to original URI:', error);
    return uri;
  }
}
