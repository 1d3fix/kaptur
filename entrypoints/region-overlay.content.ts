import type {
  CaptureCreatedPayload,
  KapturMessage,
  KapturResponse,
  RegionRectCss,
} from '@/lib/messaging/types';

declare global {
  interface Window {
    __kapturRegionOverlayLoaded?: boolean;
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  runAt: 'document_idle',
  main() {
    if (window.__kapturRegionOverlayLoaded) return;
    window.__kapturRegionOverlayLoaded = true;

    let busy = false;

    browser.runtime.onMessage.addListener(
      (raw: unknown, sender, sendResponse) => {
        if (sender.id !== browser.runtime.id) return false;
        const msg = raw as KapturMessage;
        if (msg.type !== 'START_REGION_OVERLAY') return;
        if (busy) {
          sendResponse({ ok: false, error: 'Overlay already active.' });
          return;
        }
        busy = true;
        sendResponse({ ok: true });
        runRegionOverlay(msg.sessionId)
          .catch((err) => console.error('[Kaptur] overlay failed', err))
          .finally(() => {
            busy = false;
          });
      },
    );
  },
});

async function runRegionOverlay(sessionId: number): Promise<void> {
  const rect = await showSelectionOverlay();
  if (!rect) return;

  // Give the browser a frame to repaint without the overlay before capture.
  await new Promise((r) => setTimeout(r, 90));

  const res = (await browser.runtime.sendMessage({
    type: 'CAPTURE_REGION_COMPLETE',
    sessionId,
    rect,
  } satisfies KapturMessage)) as
    | KapturResponse<CaptureCreatedPayload>
    | undefined;

  if (!res) {
    showInPageToast('Error: no response from service worker.', 'error');
    return;
  }
  if (res.ok) {
    showInPageToast(`Capture saved: "${res.data?.customName ?? '…'}"`);
  } else {
    showInPageToast(`Error: ${res.error}`, 'error');
  }
}

function showSelectionOverlay(): Promise<RegionRectCss | null> {
  return new Promise((resolve) => {
    const ac = new AbortController();
    const { signal } = ac;
    let settled = false;

    const container = document.createElement('div');
    container.setAttribute('data-kaptur-overlay', '');
    container.style.cssText = [
      'position: fixed',
      'inset: 0',
      'z-index: 2147483647',
      'cursor: crosshair',
      'user-select: none',
      '-webkit-user-select: none',
    ].join(';');

    const backdrop = document.createElement('div');
    backdrop.style.cssText = [
      'position: absolute',
      'inset: 0',
      'background: rgba(0,0,0,0.4)',
      'pointer-events: none',
    ].join(';');

    const selection = document.createElement('div');
    selection.style.cssText = [
      'position: absolute',
      'left: 0',
      'top: 0',
      'width: 0',
      'height: 0',
      'border: 2px dashed white',
      'box-shadow: 0 0 0 9999px rgba(0,0,0,0.45)',
      'display: none',
      'pointer-events: none',
    ].join(';');

    const label = document.createElement('div');
    label.style.cssText = [
      'position: absolute',
      'left: 0',
      'top: 0',
      'padding: 4px 8px',
      'background: rgba(0,0,0,0.85)',
      'color: white',
      'font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace',
      'border-radius: 4px',
      'display: none',
      'pointer-events: none',
      'white-space: nowrap',
    ].join(';');

    const help = document.createElement('div');
    help.textContent = 'Drag to select — Esc to cancel — Enter to confirm';
    help.style.cssText = [
      'position: absolute',
      'top: 16px',
      'left: 50%',
      'transform: translateX(-50%)',
      'padding: 6px 12px',
      'background: rgba(0,0,0,0.85)',
      'color: white',
      'font: 12px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif',
      'border-radius: 6px',
      'pointer-events: none',
    ].join(';');

    container.appendChild(backdrop);
    container.appendChild(selection);
    container.appendChild(label);
    container.appendChild(help);
    document.documentElement.appendChild(container);

    let startX = 0;
    let startY = 0;
    let curX = 0;
    let curY = 0;
    let dragging = false;

    function paintSelection() {
      const x = Math.min(startX, curX);
      const y = Math.min(startY, curY);
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);
      selection.style.left = `${x}px`;
      selection.style.top = `${y}px`;
      selection.style.width = `${w}px`;
      selection.style.height = `${h}px`;

      label.textContent = `${Math.round(w)} × ${Math.round(h)}`;
      const labelX = Math.min(window.innerWidth - 80, curX + 12);
      const labelY = Math.min(window.innerHeight - 28, curY + 12);
      label.style.left = `${labelX}px`;
      label.style.top = `${labelY}px`;
    }

    function finish(result: RegionRectCss | null) {
      if (settled) return;
      settled = true;
      ac.abort();
      container.remove();
      resolve(result);
    }

    function commit() {
      const x = Math.min(startX, curX);
      const y = Math.min(startY, curY);
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);
      if (w < 5 || h < 5) {
        finish(null);
        return;
      }
      finish({ x, y, width: w, height: h, dpr: window.devicePixelRatio });
    }

    container.addEventListener(
      'mousedown',
      (e: MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        curX = e.clientX;
        curY = e.clientY;
        dragging = true;
        backdrop.style.display = 'none';
        selection.style.display = 'block';
        label.style.display = 'block';
        paintSelection();
      },
      { signal },
    );

    window.addEventListener(
      'mousemove',
      (e: MouseEvent) => {
        if (!dragging) return;
        curX = e.clientX;
        curY = e.clientY;
        paintSelection();
      },
      { signal, capture: true },
    );

    window.addEventListener(
      'mouseup',
      () => {
        if (!dragging) return;
        dragging = false;
        commit();
      },
      { signal, capture: true },
    );

    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(null);
        } else if (e.key === 'Enter' && dragging) {
          e.preventDefault();
          dragging = false;
          commit();
        }
      },
      { signal, capture: true },
    );

    container.addEventListener(
      'contextmenu',
      (e: MouseEvent) => {
        e.preventDefault();
        finish(null);
      },
      { signal },
    );
  });
}

function showInPageToast(
  message: string,
  kind: 'success' | 'error' = 'success',
) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = [
    'position: fixed',
    'top: 16px',
    'right: 16px',
    'z-index: 2147483647',
    'padding: 10px 14px',
    'background: ' + (kind === 'error' ? '#dc2626' : '#16a34a'),
    'color: white',
    'font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif',
    'border-radius: 6px',
    'box-shadow: 0 4px 16px rgba(0,0,0,0.25)',
    'max-width: 360px',
    'opacity: 0',
    'transition: opacity 150ms ease',
  ].join(';');
  document.documentElement.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2600);
}
