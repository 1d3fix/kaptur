export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function cropImage(
  source: Blob,
  rect: CropRect,
): Promise<CropResult> {
  const bitmap = await createImageBitmap(source);
  try {
    const x = Math.max(0, Math.min(bitmap.width - 1, Math.round(rect.x)));
    const y = Math.max(0, Math.min(bitmap.height - 1, Math.round(rect.y)));
    const w = Math.max(1, Math.min(bitmap.width - x, Math.round(rect.width)));
    const h = Math.max(1, Math.min(bitmap.height - y, Math.round(rect.height)));

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.drawImage(bitmap, x, y, w, h, 0, 0, w, h);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return { blob, width: w, height: h };
  } finally {
    bitmap.close();
  }
}
