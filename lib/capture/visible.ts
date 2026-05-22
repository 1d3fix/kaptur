export interface VisibleCaptureResult {
  blob: Blob;
  width: number;
  height: number;
  tab: chrome.tabs.Tab;
}

export async function captureWindowAsBlob(windowId?: number): Promise<Blob> {
  const dataUrl =
    typeof windowId === 'number'
      ? await browser.tabs.captureVisibleTab(windowId, { format: 'png' })
      : await browser.tabs.captureVisibleTab({ format: 'png' });
  if (!dataUrl) {
    throw new Error('captureVisibleTab returned an empty value.');
  }
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function blobDimensions(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();
  return { width, height };
}

const BLOCKED_SCHEMES = [
  'chrome://',
  'chrome-extension://',
  'about:',
  'edge://',
];

export function isCapturableUrl(url: string): boolean {
  return !BLOCKED_SCHEMES.some((s) => url.startsWith(s));
}

export async function captureVisibleTab(): Promise<VisibleCaptureResult> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab) {
    throw new Error('No active tab found.');
  }
  if (!tab.url || !isCapturableUrl(tab.url)) {
    throw new Error('This tab cannot be captured (internal browser page).');
  }

  const blob = await captureWindowAsBlob(tab.windowId);
  const { width, height } = await blobDimensions(blob);
  return { blob, width, height, tab };
}
