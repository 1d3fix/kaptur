import JSZip from 'jszip';
import { db, type Capture, type Session } from '@/lib/db/schema';
import { getExportSettings } from '@/lib/db/settings';
import { formatFilename, sanitizeFsSegment, uniquifyFilenames } from './naming';

export interface ZipExportSummary {
  zipFileName: string;
  fileCount: number;
}

export interface ZipExportOptions {
  /** Captures to export, in the order they should be indexed. */
  captures: Capture[];
  /** Session context for {session} token + zip name default. */
  session?: Session;
  /** Override the zip file name (without extension). */
  zipBaseName?: string;
}

export async function exportCapturesToZip(
  opts: ZipExportOptions,
): Promise<ZipExportSummary> {
  if (opts.captures.length === 0) {
    throw new Error('No captures to export.');
  }

  const { fileNameTemplate } = await getExportSettings();
  const zip = new JSZip();

  const rawNames = opts.captures.map((c, idx) =>
    formatFilename(fileNameTemplate, {
      capture: c,
      session: opts.session,
      index: idx + 1,
    }),
  );
  const finalNames = uniquifyFilenames(rawNames);

  for (let i = 0; i < opts.captures.length; i++) {
    const c = opts.captures[i]!;
    const name = finalNames[i]!;
    zip.file(name, c.imageBlob);
  }

  const baseName = opts.zipBaseName
    ? sanitizeFsSegment(opts.zipBaseName)
    : opts.session
      ? sanitizeFsSegment(opts.session.slug)
      : 'kaptur-export';
  const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFileName = `${baseName}_${dateStamp}.zip`;

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { zipFileName, fileCount: opts.captures.length };
}

export interface MediaZipOptions {
  items: Array<{ blob: Blob; filename: string }>;
  zipBaseName: string;
}

export async function exportMediaToZip(
  opts: MediaZipOptions,
): Promise<ZipExportSummary> {
  if (opts.items.length === 0) throw new Error('No media to export.');

  const zip = new JSZip();
  const finalNames = uniquifyFilenames(opts.items.map((i) => i.filename));

  for (let i = 0; i < opts.items.length; i++) {
    zip.file(finalNames[i]!, opts.items[i]!.blob);
  }

  const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFileName = `${sanitizeFsSegment(opts.zipBaseName)}_${dateStamp}.zip`;

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { zipFileName, fileCount: opts.items.length };
}

export interface SinglePngExportSummary {
  fileName: string;
}

/**
 * Download a single capture as a PNG using the configured naming template.
 * The {index} token reflects the capture's chronological position within its
 * session (1-based).
 */
export async function downloadCaptureAsPng(
  capture: Capture,
  session?: Session,
): Promise<SinglePngExportSummary> {
  if (capture.id === undefined) {
    throw new Error('Capture without identifier.');
  }

  const { fileNameTemplate } = await getExportSettings();

  let index = 1;
  try {
    const peers = await db.captures
      .where('sessionId')
      .equals(capture.sessionId)
      .toArray();
    peers.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    const found = peers.findIndex((c) => c.id === capture.id);
    if (found >= 0) index = found + 1;
  } catch {
    // fall back to index = 1
  }

  const fileName = formatFilename(fileNameTemplate, {
    capture,
    session,
    index,
  });

  const url = URL.createObjectURL(capture.imageBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { fileName };
}
