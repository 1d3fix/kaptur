const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5 MB

export interface HtmlCaptureResult {
  html: string;
  size: number;
}

export async function captureHtmlForTab(
  tabId: number,
): Promise<HtmlCaptureResult | null> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML,
    });
    const html = results[0]?.result;
    if (typeof html !== 'string' || html.length === 0) return null;
    const rawSize = new Blob([html]).size;
    if (rawSize > MAX_HTML_BYTES) {
      const truncated = html.slice(0, MAX_HTML_BYTES);
      return { html: truncated, size: new Blob([truncated]).size };
    }
    return { html, size: rawSize };
  } catch (err) {
    console.warn('[Kaptur] captureHtmlForTab failed', err);
    return null;
  }
}
