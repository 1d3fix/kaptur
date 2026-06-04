import { captureHtmlForTab } from '@/lib/capture/html';
import { collectMediaForTab } from '@/lib/capture/media';
import { getTabMetadata } from '@/lib/capture/metadata';
import { cropImage } from '@/lib/capture/region';
import {
  blobDimensions,
  captureVisibleTab,
  captureWindowAsBlob,
  isCapturableUrl,
} from '@/lib/capture/visible';
import { captureFullPage } from '@/lib/fullPageCapture';
import {
  createCapture,
  markMediaCollected,
  saveMediaItems,
} from '@/lib/db/mutations';
import { getBannerLocale } from '@/lib/db/settings';
import { addBanner } from '@/lib/image/banner';
import { sha256, sha256Text } from '@/lib/image/hash';
import { generateThumbnail } from '@/lib/image/thumbnail';
import type {
  CaptureCreatedPayload,
  KapturMessage,
  KapturResponse,
  RegionRectCss,
} from '@/lib/messaging/types';

type CaptureType = 'visible' | 'region' | 'full-page';

interface PersistCaptureInput {
  sessionId: number;
  captureType: CaptureType;
  blob: Blob;
  tab: chrome.tabs.Tab;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (
      raw: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (r: KapturResponse) => void,
    ) => {
      if (sender.id !== browser.runtime.id) return false;

      const message = parseMessage(raw);
      if (!message) {
        sendResponse({ ok: false, error: 'Malformed message.' });
        return false;
      }

      void handleMessage(message, sender)
        .then(sendResponse)
        .catch((err: unknown) => {
          console.error('[Kaptur] message handler failed', err);
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true;
    },
  );
});

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isSessionId(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

function parseMessage(raw: unknown): KapturMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;
  switch (m['type']) {
    case 'CAPTURE_VISIBLE':
    case 'CAPTURE_REGION_START':
    case 'CAPTURE_FULL_PAGE':
      return isSessionId(m['sessionId'])
        ? (m as unknown as KapturMessage)
        : null;
    case 'CAPTURE_REGION_COMPLETE': {
      const r = m['rect'];
      if (!isSessionId(m['sessionId'])) return null;
      if (typeof r !== 'object' || r === null) return null;
      const rect = r as Record<string, unknown>;
      if (
        !isFiniteNumber(rect['x']) ||
        !isFiniteNumber(rect['y']) ||
        !isFiniteNumber(rect['width']) ||
        !isFiniteNumber(rect['height']) ||
        !isFiniteNumber(rect['dpr'])
      )
        return null;
      return m as unknown as KapturMessage;
    }
    case 'START_REGION_OVERLAY':
      return isSessionId(m['sessionId'])
        ? (m as unknown as KapturMessage)
        : null;
    case 'OPEN_DASHBOARD':
      if (m['route'] !== undefined) {
        if (typeof m['route'] !== 'string' || !m['route'].startsWith('#/'))
          return null;
      }
      return m as unknown as KapturMessage;
    default:
      return null;
  }
}

async function handleMessage(
  message: KapturMessage,
  sender: chrome.runtime.MessageSender,
): Promise<KapturResponse<CaptureCreatedPayload | undefined>> {
  switch (message.type) {
    case 'CAPTURE_VISIBLE':
      return handleCaptureVisible(message.sessionId);
    case 'CAPTURE_FULL_PAGE':
      return handleCaptureFullPage(message.sessionId, message.scrollDelay);
    case 'CAPTURE_REGION_START':
      return handleCaptureRegionStart(message.sessionId);
    case 'CAPTURE_REGION_COMPLETE':
      return handleCaptureRegionComplete(
        message.sessionId,
        message.rect,
        sender,
      );
    case 'START_REGION_OVERLAY':
      return {
        ok: false,
        error: 'START_REGION_OVERLAY is meant for the content script.',
      };
    case 'OPEN_DASHBOARD': {
      const url =
        browser.runtime.getURL('/app.html') + (message.route ?? '#/sessions');
      await browser.tabs.create({ url });
      return { ok: true };
    }
  }
}

async function handleCaptureVisible(
  sessionId: number,
): Promise<KapturResponse<CaptureCreatedPayload>> {
  const { blob, tab } = await captureVisibleTab();
  return persistCapture({
    sessionId,
    captureType: 'visible',
    blob,
    tab,
  });
}

async function handleCaptureFullPage(
  sessionId: number,
  scrollDelay?: number,
): Promise<KapturResponse<CaptureCreatedPayload>> {
  const { blob, tab } = await captureFullPage({ scrollDelay });
  return persistCapture({
    sessionId,
    captureType: 'full-page',
    blob,
    tab,
  });
}

async function handleCaptureRegionStart(
  sessionId: number,
): Promise<KapturResponse<undefined>> {
  const tab = await getCapturableActiveTab();
  if (typeof tab.id !== 'number') {
    throw new Error('Active tab has no identifier.');
  }

  await browser.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['/content-scripts/region-overlay.js'],
  });

  await browser.tabs.sendMessage(tab.id, {
    type: 'START_REGION_OVERLAY',
    sessionId,
  } satisfies KapturMessage);

  return { ok: true };
}

async function handleCaptureRegionComplete(
  sessionId: number,
  rect: RegionRectCss,
  sender: chrome.runtime.MessageSender,
): Promise<KapturResponse<CaptureCreatedPayload>> {
  const tab = sender.tab;
  if (!tab || typeof tab.id !== 'number') {
    throw new Error('Could not identify the sender tab.');
  }

  // Verify the sender tab is still the active tab in its window before
  // capturing — guards against split-view scenarios where a different tab
  // became focused while the overlay was open.
  const liveTab = await browser.tabs.get(tab.id);
  if (!liveTab.active) {
    throw new Error(
      'The tab is no longer active. Please retry the region capture.',
    );
  }

  const fullBlob = await captureWindowAsBlob(tab.windowId);
  const { width: fullW, height: fullH } = await blobDimensions(fullBlob);

  const dpr = rect.dpr > 0 ? rect.dpr : 1;
  const cropRect = {
    x: rect.x * dpr,
    y: rect.y * dpr,
    width: rect.width * dpr,
    height: rect.height * dpr,
  };

  cropRect.x = Math.min(cropRect.x, fullW - 1);
  cropRect.y = Math.min(cropRect.y, fullH - 1);

  const { blob } = await cropImage(fullBlob, cropRect);

  return persistCapture({
    sessionId,
    captureType: 'region',
    blob,
    tab,
  });
}

async function persistCapture(
  input: PersistCaptureInput,
): Promise<KapturResponse<CaptureCreatedPayload>> {
  const { sessionId, captureType, blob: rawBlob, tab } = input;
  const tabId = tab.id;
  const metadata =
    typeof tabId === 'number'
      ? await getTabMetadata(tabId)
      : {
          title: tab.title ?? '',
          url: tab.url ?? '',
          viewportWidth: 0,
          viewportHeight: 0,
          devicePixelRatio: 1,
          userAgent: '',
        };

  const capturedAt = new Date();
  const rawHash = await sha256(rawBlob);

  const htmlResult =
    typeof tabId === 'number' ? await captureHtmlForTab(tabId) : null;
  const htmlContent = htmlResult?.html;
  const htmlSize = htmlResult?.size;
  const htmlHash = htmlContent ? await sha256Text(htmlContent) : undefined;

  const locale = await getBannerLocale();
  const bannered = await addBanner(rawBlob, {
    timestamp: capturedAt,
    htmlHash,
    locale,
    dpr: metadata.devicePixelRatio,
  });
  const finalHash = await sha256(bannered);
  const thumbnail = await generateThumbnail(bannered, 240);
  const { width, height } = await blobDimensions(bannered);

  const url = tab.url ?? metadata.url;
  const pageTitle = tab.title ?? metadata.title ?? '';
  const customName = deriveCustomName(pageTitle, url);

  const captureId = await createCapture({
    sessionId,
    captureType,
    imageBlob: bannered,
    rawImageBlob: rawBlob,
    thumbnailBlob: thumbnail,
    rawHash,
    finalHash,
    htmlHash,
    htmlContent,
    htmlSize,
    width,
    height,
    url,
    pageTitle,
    customName,
    capturedAt,
    viewportWidth: metadata.viewportWidth,
    viewportHeight: metadata.viewportHeight,
    devicePixelRatio: metadata.devicePixelRatio,
    userAgent: metadata.userAgent,
  });

  if (typeof tabId === 'number') {
    void collectAndSaveMedia(captureId, tabId);
  } else {
    void markMediaCollected(captureId);
  }

  return { ok: true, data: { captureId, customName } };
}

async function getCapturableActiveTab(): Promise<chrome.tabs.Tab> {
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
  return tab;
}

function deriveCustomName(pageTitle: string, url: string): string {
  const trimmed = pageTitle.trim();
  if (trimmed) return trimmed.slice(0, 120);
  try {
    return new URL(url).hostname;
  } catch {
    return 'Capture';
  }
}

async function collectAndSaveMedia(
  captureId: number,
  tabId: number,
): Promise<void> {
  try {
    const items = await collectMediaForTab(tabId);
    if (items.length > 0) {
      await saveMediaItems(
        captureId,
        items.map((item) => ({
          ...item,
          fetchStatus: 'pending' as const,
          fetchedAt: new Date(),
        })),
      );
    }
  } catch (err) {
    console.error('[Kaptur] media collection failed', err);
  } finally {
    await markMediaCollected(captureId);
  }
}
