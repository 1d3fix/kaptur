import type { KapturMessage, KapturResponse } from './types';

export async function sendMessage<T = unknown>(
  message: KapturMessage,
): Promise<KapturResponse<T>> {
  try {
    const response = (await browser.runtime.sendMessage(message)) as
      | KapturResponse<T>
      | undefined;
    if (!response) {
      return { ok: false, error: 'No response from service worker.' };
    }
    return response;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
