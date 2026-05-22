export async function ensureStoragePersistent(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    const already = await navigator.storage.persisted();
    if (already) return true;
    return await navigator.storage.persist();
  } catch (err) {
    console.warn('[Kaptur] storage.persist failed', err);
    return false;
  }
}
