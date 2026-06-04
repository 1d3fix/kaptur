import type { FullPageHelperMessage } from '@/lib/messaging/types';

declare global {
  interface Window {
    __kapturFullPageHelperLoaded?: boolean;
  }
}

interface FrozenElement {
  el: HTMLElement;
  originalCssText: string;
}

let frozenElements: FrozenElement[] = [];
let scrollbarStyleEl: HTMLStyleElement | null = null;

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  runAt: 'document_idle',
  main() {
    if (window.__kapturFullPageHelperLoaded) return;
    window.__kapturFullPageHelperLoaded = true;

    browser.runtime.onMessage.addListener(
      (raw: unknown, sender, sendResponse) => {
        if (sender.id !== browser.runtime.id) return false;
        const msg = raw as FullPageHelperMessage;

        switch (msg.type) {
          case 'FP_GET_DIMENSIONS':
            sendResponse({
              totalHeight: Math.max(
                document.documentElement.scrollHeight,
                document.body?.scrollHeight ?? 0,
              ),
              viewportHeight: window.innerHeight,
              viewportWidth: window.innerWidth,
              scrollTop: window.scrollY,
              dpr: window.devicePixelRatio,
            });
            return false;

          case 'FP_FREEZE_FIXED':
            hideScrollbar();
            frozenElements = freezeFixed();
            sendResponse({ ok: true });
            return false;

          case 'FP_SCROLL_TO':
            window.scrollTo(0, msg.y);
            sendResponse({ ok: true });
            return false;

          case 'FP_UNFREEZE_FIXED':
            unfreezeFixed(frozenElements);
            frozenElements = [];
            showScrollbar();
            sendResponse({ ok: true });
            return false;

          default:
            return false;
        }
      },
    );
  },
});

function hideScrollbar(): void {
  scrollbarStyleEl = document.createElement('style');
  scrollbarStyleEl.textContent =
    'html::-webkit-scrollbar{display:none!important}' +
    'html{scrollbar-width:none!important;overflow-y:scroll!important}';
  document.head.appendChild(scrollbarStyleEl);
}

function showScrollbar(): void {
  scrollbarStyleEl?.remove();
  scrollbarStyleEl = null;
}

function freezeFixed(): FrozenElement[] {
  const frozen: FrozenElement[] = [];
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  const all = document.querySelectorAll<HTMLElement>('*');
  for (const el of all) {
    const pos = window.getComputedStyle(el).position;
    if (pos !== 'fixed' && pos !== 'sticky') continue;

    const rect = el.getBoundingClientRect();
    frozen.push({ el, originalCssText: el.style.cssText });

    // Pin to the element's current visual position in document coordinates.
    // Explicit width/height prevents relayout when position changes.
    el.style.position = 'absolute';
    el.style.top = `${rect.top + scrollY}px`;
    el.style.left = `${rect.left + scrollX}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.margin = '0';
  }

  return frozen;
}

function unfreezeFixed(frozen: FrozenElement[]): void {
  for (const { el, originalCssText } of frozen) {
    el.style.cssText = originalCssText;
  }
}
