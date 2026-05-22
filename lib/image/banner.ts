import { formatISO } from 'date-fns';

export interface AddBannerOptions {
  timestamp: Date;
  htmlHash?: string;
  locale?: 'en' | 'fr';
  dpr?: number;
}

const LABELS = {
  en: { capturedAt: 'Captured at', sha: 'HTML SHA-256' },
  fr: { capturedAt: 'Capturé le', sha: 'SHA-256 HTML' },
} as const;

const BASE_FONT_TIMESTAMP = 14;
const BASE_FONT_HASH = 13;
const BASE_PADDING_X = 12;
const BASE_PADDING_Y = 8;
const BASE_LINE_GAP = 4;
const MIN_FONT_SIZE = 8;

export async function addBanner(
  imageBlob: Blob,
  opts: AddBannerOptions,
): Promise<Blob> {
  const scale = Math.max(1, Math.round(opts.dpr ?? 1));
  const paddingX = BASE_PADDING_X * scale;
  const paddingY = BASE_PADDING_Y * scale;
  const lineGap = BASE_LINE_GAP * scale;

  const labels = LABELS[opts.locale ?? 'en'];

  const bitmap = await createImageBitmap(imageBlob);
  try {
    const iso = formatISO(opts.timestamp);
    const timestampLine = `${labels.capturedAt} : ${iso}`;
    const availableWidth = bitmap.width - paddingX * 2;

    const measureCanvas = new OffscreenCanvas(1, 1);
    const measureCtx = measureCanvas.getContext('2d');
    if (!measureCtx) throw new Error('2D context unavailable for measurement');

    const fontFamily = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    const fontTimestamp = fitFontSize(
      measureCtx,
      timestampLine,
      availableWidth,
      BASE_FONT_TIMESTAMP * scale,
      fontFamily,
    );

    const showHash = !!opts.htmlHash;
    const hashLine = showHash ? `${labels.sha} : ${opts.htmlHash}` : '';
    const fontHash = showHash
      ? fitFontSize(
          measureCtx,
          hashLine,
          availableWidth,
          BASE_FONT_HASH * scale,
          fontFamily,
        )
      : 0;

    const lineH1 = fontTimestamp;
    const lineH2 = showHash ? fontHash : 0;
    const bannerHeight =
      paddingY * 2 + lineH1 + (showHash ? lineGap + lineH2 : 0);

    const canvas = new OffscreenCanvas(
      bitmap.width,
      bitmap.height + bannerHeight,
    );
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');

    ctx.drawImage(bitmap, 0, 0);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, bitmap.height, bitmap.width, bannerHeight);

    ctx.fillStyle = '#fafafa';
    ctx.textBaseline = 'top';

    ctx.font = `${fontTimestamp}px ${fontFamily}`;
    ctx.fillText(timestampLine, paddingX, bitmap.height + paddingY);

    if (showHash) {
      ctx.font = `${fontHash}px ${fontFamily}`;
      ctx.fillText(
        hashLine,
        paddingX,
        bitmap.height + paddingY + lineH1 + lineGap,
      );
    }

    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    bitmap.close();
  }
}

function fitFontSize(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initial: number,
  fontFamily: string,
): number {
  let size = initial;
  while (size > MIN_FONT_SIZE) {
    ctx.font = `${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  }
  return MIN_FONT_SIZE;
}
