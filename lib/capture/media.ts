export interface PageMediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
  mimeType?: string;
  alt?: string;
  naturalWidth?: number;
  naturalHeight?: number;
}

export async function collectMediaForTab(
  tabId: number,
): Promise<PageMediaItem[]> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: _collectMediaFromPage,
    });
    const raw = results[0]?.result;
    return Array.isArray(raw) ? (raw as PageMediaItem[]) : [];
  } catch {
    return [];
  }
}

// Injected into the page — must be self-contained (no closures, no imports).
function _collectMediaFromPage(): Array<{
  url: string;
  type: string;
  mimeType?: string;
  alt?: string;
  naturalWidth?: number;
  naturalHeight?: number;
}> {
  const items: Array<{
    url: string;
    type: string;
    mimeType?: string;
    alt?: string;
    naturalWidth?: number;
    naturalHeight?: number;
  }> = [];
  const seen = new Set<string>();

  function add(
    url: string,
    type: string,
    extra: {
      mimeType?: string;
      alt?: string;
      naturalWidth?: number;
      naturalHeight?: number;
    },
  ) {
    if (!url || seen.has(url)) return;
    if (url.startsWith('data:')) return; // skip inline data URIs
    seen.add(url);
    items.push({ url, type, ...extra });
  }

  document.querySelectorAll('img').forEach((el) => {
    const img = el as HTMLImageElement;
    const url = img.currentSrc || img.src;
    if (url)
      add(url, 'image', {
        alt: img.alt || undefined,
        naturalWidth: img.naturalWidth || undefined,
        naturalHeight: img.naturalHeight || undefined,
      });
  });

  document.querySelectorAll('video').forEach((el) => {
    const video = el as HTMLVideoElement;
    const url = video.currentSrc || video.src;
    if (url) add(url, 'video', {});
    video.querySelectorAll('source').forEach((s) => {
      const src = s as HTMLSourceElement;
      if (src.src) add(src.src, 'video', { mimeType: src.type || undefined });
    });
  });

  document.querySelectorAll('audio').forEach((el) => {
    const audio = el as HTMLAudioElement;
    const url = audio.currentSrc || audio.src;
    if (url) add(url, 'audio', {});
    audio.querySelectorAll('source').forEach((s) => {
      const src = s as HTMLSourceElement;
      if (src.src) add(src.src, 'audio', { mimeType: src.type || undefined });
    });
  });

  return items.slice(0, 100);
}
