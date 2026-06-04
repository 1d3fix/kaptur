import type {
  FullPageDimensions,
  FullPageHelperMessage,
} from '@/lib/messaging/types';
import { isCapturableUrl } from '@/lib/capture/visible';

export interface FullPageCaptureResult {
  blob: Blob;
  tab: chrome.tabs.Tab;
}

export interface FullPageCaptureOptions {
  scrollDelay?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fpSend<T>(
  tabId: number,
  msg: FullPageHelperMessage,
): Promise<T> {
  return (await browser.tabs.sendMessage(tabId, msg)) as T;
}

export async function captureFullPage(
  opts: FullPageCaptureOptions = {},
): Promise<FullPageCaptureResult> {
  // Chrome enforces MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND (2/s).
  // 510 ms gives a comfortable margin under that quota.
  const { scrollDelay = 510 } = opts;

  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab || typeof tab.id !== 'number') {
    throw new Error('No active tab found.');
  }
  if (!tab.url || !isCapturableUrl(tab.url)) {
    throw new Error('This tab cannot be captured (internal browser page).');
  }

  const tabId = tab.id;
  const windowId = tab.windowId;

  // Inject the helper content script (guard against double-injection is inside
  // the script itself via window.__kapturFullPageHelperLoaded).
  await browser.scripting.executeScript({
    target: { tabId },
    files: ['/content-scripts/fullpage-helper.js'],
  });

  const dims = await fpSend<FullPageDimensions>(tabId, {
    type: 'FP_GET_DIMENSIONS',
  });

  const { totalHeight, viewportHeight, viewportWidth, scrollTop } = dims;
  const dpr = dims.dpr > 0 ? dims.dpr : 1;

  // Freeze fixed/sticky elements so they appear only once in the final image.
  await fpSend(tabId, { type: 'FP_FREEZE_FIXED' });

  const canvasW = Math.round(viewportWidth * dpr);
  const canvasH = Math.round(totalHeight * dpr);
  const canvas = new OffscreenCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable.');

  const numStrips = Math.ceil(totalHeight / viewportHeight);
  // Maximum scroll offset the browser will actually honour.
  const maxScrollY = Math.max(0, totalHeight - viewportHeight);

  try {
    for (let i = 0; i < numStrips; i++) {
      const targetScrollY = i * viewportHeight;
      // The browser clamps scroll at maxScrollY, so the last strip(s) may not
      // reach targetScrollY. Track how far off we are so we read from the
      // correct row inside the captured bitmap.
      const actualScrollY = Math.min(targetScrollY, maxScrollY);
      const srcOffsetY = targetScrollY - actualScrollY;

      // Height of real page content for this strip (last strip may be shorter).
      const stripContentH = Math.min(
        viewportHeight,
        totalHeight - targetScrollY,
      );

      await fpSend(tabId, { type: 'FP_SCROLL_TO', y: actualScrollY });
      await delay(scrollDelay);

      const dataUrl = await browser.tabs.captureVisibleTab(windowId, {
        format: 'png',
      });
      if (!dataUrl) throw new Error('captureVisibleTab returned empty value.');

      const stripBlob = await (await fetch(dataUrl)).blob();
      const bitmap = await createImageBitmap(stripBlob);

      // Read `stripContentH` rows starting at `srcOffsetY` inside the bitmap,
      // place them at the correct vertical offset in the final canvas.
      const srcY = Math.round(srcOffsetY * dpr);
      const srcH = Math.round(stripContentH * dpr);
      const dstY = Math.round(targetScrollY * dpr);
      ctx.drawImage(
        bitmap,
        0,
        srcY,
        bitmap.width,
        srcH,
        0,
        dstY,
        canvasW,
        srcH,
      );
      bitmap.close();
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return { blob, tab };
  } finally {
    // Best-effort: restore fixed elements and original scroll position.
    await fpSend(tabId, { type: 'FP_UNFREEZE_FIXED' }).catch(() => undefined);
    await fpSend(tabId, { type: 'FP_SCROLL_TO', y: scrollTop }).catch(
      () => undefined,
    );
  }
}
