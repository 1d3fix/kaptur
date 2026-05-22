export interface TabMetadata {
  title: string;
  url: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  userAgent: string;
}

export async function getTabMetadata(tabId: number): Promise<TabMetadata> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: collectTabMetadata,
    });
    const first = results[0];
    if (first?.result) return first.result;
  } catch (err) {
    console.warn('[Kaptur] getTabMetadata failed', err);
  }
  return fallbackMetadata();
}

function collectTabMetadata(): TabMetadata {
  return {
    title: document.title,
    url: location.href,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    userAgent: navigator.userAgent,
  };
}

function fallbackMetadata(): TabMetadata {
  return {
    title: '',
    url: '',
    viewportWidth: 0,
    viewportHeight: 0,
    devicePixelRatio: 1,
    userAgent: globalThis.navigator?.userAgent ?? '',
  };
}
