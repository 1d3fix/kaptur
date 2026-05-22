import { parse as parseExif } from 'exifr';
import { sha256 } from '@/lib/image/hash';
import type { CapturedMedia } from '@/lib/db/schema';
import type { PageMediaItem } from '@/lib/capture/media';

const MAX_BLOB_SIZE = 10 * 1024 * 1024; // 10 MB

export type MediaProcessResult = Omit<CapturedMedia, 'id' | 'captureId'>;

export async function processMediaItem(
  item: PageMediaItem,
): Promise<MediaProcessResult> {
  const base = {
    url: item.url,
    type: item.type,
    mimeType: item.mimeType,
    alt: item.alt,
    naturalWidth: item.naturalWidth,
    naturalHeight: item.naturalHeight,
    fetchedAt: new Date(),
  } as const;

  // Videos: store URL only, download is user-initiated from the UI
  if (item.type === 'video') {
    return { ...base, fetchStatus: 'skipped' };
  }

  // blob: URLs are scoped to the page context and cannot be fetched from SW
  if (item.url.startsWith('blob:')) {
    return {
      ...base,
      fetchStatus: 'skipped',
      fetchError: 'blob: URL not accessible from extension context',
    };
  }

  try {
    const res = await fetch(item.url);

    if (!res.ok) {
      return {
        ...base,
        fetchStatus: 'fetch_error',
        fetchError: `HTTP ${res.status} ${res.statusText}`.trim(),
      };
    }

    // Check declared size before reading the full body
    const cl = res.headers.get('content-length');
    if (cl && parseInt(cl) > MAX_BLOB_SIZE) {
      await res.body?.cancel();
      return { ...base, fetchStatus: 'too_large', size: parseInt(cl) };
    }

    const blob = await res.blob();

    if (blob.size > MAX_BLOB_SIZE) {
      return { ...base, fetchStatus: 'too_large', size: blob.size };
    }

    const hash = await sha256(blob);
    const detectedMime = item.mimeType ?? (blob.type || undefined);

    let exif: string | undefined;
    if (item.type === 'image') {
      try {
        const exifData = await parseExif(blob, {
          tiff: true,
          exif: true,
          gps: true,
          xmp: false,
          iptc: false,
          icc: false,
          jfif: false,
          sanitize: true,
          mergeOutput: true,
        });
        if (exifData && typeof exifData === 'object') {
          exif = JSON.stringify(exifData, (_key, value) => {
            // Drop binary chunks (thumbnails, ICC profiles, etc.)
            if (ArrayBuffer.isView(value)) return undefined;
            if (value instanceof Date) return value.toISOString();
            return value;
          });
        }
      } catch {
        // EXIF parsing failure is non-fatal
      }
    }

    return {
      ...base,
      blob,
      sha256: hash,
      exif,
      fetchStatus: 'ok',
      size: blob.size,
      mimeType: detectedMime,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Heuristic: CORS errors surface as "Failed to fetch" or "NetworkError"
    const isCors =
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('networkerror') ||
      msg.toLowerCase().includes('cors');
    return {
      ...base,
      fetchStatus: isCors ? 'cors_error' : 'fetch_error',
      fetchError: msg,
    };
  }
}
