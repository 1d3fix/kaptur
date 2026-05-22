import {
  db,
  type AppSetting,
  type Capture,
  type Session,
  type Tag,
} from '@/lib/db/schema';
import { rebuildIndex } from '@/lib/search';

export const KAPTUR_FORMAT = 'kaptur';
export const KAPTUR_VERSION = 2;
const SUPPORTED_VERSIONS = new Set([1, 2]);

interface ExportedSession {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  archivedAt?: string;
  captureCount: number;
}

interface ExportedCapture {
  id: number;
  sessionId: number;
  customName: string;
  url: string;
  domain: string;
  pageTitle: string;
  capturedAt: string;
  captureType: 'visible' | 'region';

  imageBlob: string;
  rawImageBlob: string;
  thumbnailBlob: string;

  rawHash: string;
  finalHash: string;
  htmlHash?: string;

  width: number;
  height: number;

  annotationJson?: string;
  htmlContent?: string;
  htmlSize?: number;

  tags: string[];
  notes?: string;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
}

interface ExportedTag {
  id: number;
  name: string;
  color?: string;
  usageCount: number;
}

export interface KapturFile {
  format: typeof KAPTUR_FORMAT;
  version: number;
  exportedAt: string;
  counts: {
    sessions: number;
    captures: number;
    tags: number;
  };
  sessions: ExportedSession[];
  captures: ExportedCapture[];
  tags: ExportedTag[];
  settings: AppSetting[];
}

export interface ImportSummary {
  sessions: number;
  captures: number;
  tags: number;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(url)) {
    throw new Error('Refused image data URL with unexpected MIME type.');
  }
  const res = await fetch(url);
  return res.blob();
}

function serializeSession(s: Session): ExportedSession {
  if (s.id === undefined) throw new Error('Session without id');
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    color: s.color,
    archivedAt: s.archivedAt?.toISOString(),
    captureCount: s.captureCount,
  };
}

async function serializeCapture(c: Capture): Promise<ExportedCapture> {
  if (c.id === undefined) throw new Error('Capture without id');
  const [imageBlob, rawImageBlob, thumbnailBlob] = await Promise.all([
    blobToDataUrl(c.imageBlob),
    blobToDataUrl(c.rawImageBlob),
    blobToDataUrl(c.thumbnailBlob),
  ]);
  return {
    id: c.id,
    sessionId: c.sessionId,
    customName: c.customName,
    url: c.url,
    domain: c.domain,
    pageTitle: c.pageTitle,
    capturedAt: c.capturedAt.toISOString(),
    captureType: c.captureType,
    imageBlob,
    rawImageBlob,
    thumbnailBlob,
    rawHash: c.rawHash,
    finalHash: c.finalHash,
    htmlHash: c.htmlHash,
    width: c.width,
    height: c.height,
    annotationJson: c.annotationJson,
    htmlContent: c.htmlContent,
    htmlSize: c.htmlSize,
    tags: c.tags,
    notes: c.notes,
    userAgent: c.userAgent,
    viewportWidth: c.viewportWidth,
    viewportHeight: c.viewportHeight,
    devicePixelRatio: c.devicePixelRatio,
  };
}

function serializeTag(t: Tag): ExportedTag {
  if (t.id === undefined) throw new Error('Tag without id');
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    usageCount: t.usageCount,
  };
}

export async function buildKapturExport(): Promise<KapturFile> {
  const [sessions, captures, tags, settings] = await Promise.all([
    db.sessions.toArray(),
    db.captures.toArray(),
    db.tags.toArray(),
    db.settings.toArray(),
  ]);

  const serializedCaptures = await Promise.all(captures.map(serializeCapture));

  return {
    format: KAPTUR_FORMAT,
    version: KAPTUR_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      sessions: sessions.length,
      captures: captures.length,
      tags: tags.length,
    },
    sessions: sessions.map(serializeSession),
    captures: serializedCaptures,
    tags: tags.map(serializeTag),
    settings,
  };
}

export async function downloadKapturFile(): Promise<void> {
  const data = await buildKapturExport();
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `kaptur-backup-${ts}.kaptur`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const MAX_STRING = 1_000_000;
const MAX_DATAURL = 50_000_000;
const MAX_ITEMS = 100_000;

function assertString(v: unknown, field: string, maxLen = MAX_STRING): string {
  if (typeof v !== 'string')
    throw new Error(`Invalid .kaptur file: "${field}" must be a string.`);
  if (v.length > maxLen)
    throw new Error(`Invalid .kaptur file: "${field}" exceeds size limit.`);
  return v;
}

function assertOptionalString(
  v: unknown,
  field: string,
  maxLen = MAX_STRING,
): string | undefined {
  if (v === undefined || v === null) return undefined;
  return assertString(v, field, maxLen);
}

function assertInt(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0)
    throw new Error(
      `Invalid .kaptur file: "${field}" must be a non-negative integer.`,
    );
  return v;
}

function assertFiniteNumber(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new Error(
      `Invalid .kaptur file: "${field}" must be a finite number.`,
    );
  return v;
}

function assertDate(v: unknown, field: string): string {
  const s = assertString(v, field, 40);
  if (isNaN(Date.parse(s)))
    throw new Error(`Invalid .kaptur file: "${field}" is not a valid date.`);
  return s;
}

function assertStringArray(v: unknown, field: string): string[] {
  if (!Array.isArray(v))
    throw new Error(`Invalid .kaptur file: "${field}" must be an array.`);
  for (const item of v) {
    if (typeof item !== 'string')
      throw new Error(
        `Invalid .kaptur file: "${field}" contains non-string items.`,
      );
  }
  return v as string[];
}

function validateExportedSession(s: unknown, i: number): ExportedSession {
  if (typeof s !== 'object' || s === null)
    throw new Error(`Invalid session at index ${i}.`);
  const o = s as Record<string, unknown>;
  return {
    id: assertInt(o['id'], `sessions[${i}].id`),
    name: assertString(o['name'], `sessions[${i}].name`, 500),
    slug: assertString(o['slug'], `sessions[${i}].slug`, 500),
    description: assertOptionalString(
      o['description'],
      `sessions[${i}].description`,
      5000,
    ),
    createdAt: assertDate(o['createdAt'], `sessions[${i}].createdAt`),
    updatedAt: assertDate(o['updatedAt'], `sessions[${i}].updatedAt`),
    color: assertOptionalString(o['color'], `sessions[${i}].color`, 50),
    archivedAt: assertOptionalString(
      o['archivedAt'],
      `sessions[${i}].archivedAt`,
      40,
    ),
    captureCount: assertInt(o['captureCount'], `sessions[${i}].captureCount`),
  };
}

function validateExportedCapture(c: unknown, i: number): ExportedCapture {
  if (typeof c !== 'object' || c === null)
    throw new Error(`Invalid capture at index ${i}.`);
  const o = c as Record<string, unknown>;
  return {
    id: assertInt(o['id'], `captures[${i}].id`),
    sessionId: assertInt(o['sessionId'], `captures[${i}].sessionId`),
    customName: assertString(o['customName'], `captures[${i}].customName`, 500),
    url: assertString(o['url'], `captures[${i}].url`, 5000),
    domain: assertString(o['domain'], `captures[${i}].domain`, 500),
    pageTitle: assertString(o['pageTitle'], `captures[${i}].pageTitle`, 500),
    capturedAt: assertDate(o['capturedAt'], `captures[${i}].capturedAt`),
    captureType: (() => {
      const t = o['captureType'];
      if (t !== 'visible' && t !== 'region')
        throw new Error(`Invalid captures[${i}].captureType.`);
      return t;
    })(),
    imageBlob: assertString(
      o['imageBlob'],
      `captures[${i}].imageBlob`,
      MAX_DATAURL,
    ),
    rawImageBlob: assertString(
      o['rawImageBlob'],
      `captures[${i}].rawImageBlob`,
      MAX_DATAURL,
    ),
    thumbnailBlob: assertString(
      o['thumbnailBlob'],
      `captures[${i}].thumbnailBlob`,
      MAX_DATAURL,
    ),
    rawHash: assertString(o['rawHash'], `captures[${i}].rawHash`, 200),
    finalHash: assertString(o['finalHash'], `captures[${i}].finalHash`, 200),
    htmlHash: assertOptionalString(
      o['htmlHash'],
      `captures[${i}].htmlHash`,
      200,
    ),
    width: assertFiniteNumber(o['width'], `captures[${i}].width`),
    height: assertFiniteNumber(o['height'], `captures[${i}].height`),
    annotationJson: assertOptionalString(
      o['annotationJson'],
      `captures[${i}].annotationJson`,
    ),
    htmlContent: assertOptionalString(
      o['htmlContent'],
      `captures[${i}].htmlContent`,
      MAX_DATAURL,
    ),
    htmlSize:
      o['htmlSize'] === undefined || o['htmlSize'] === null
        ? undefined
        : assertInt(o['htmlSize'], `captures[${i}].htmlSize`),
    tags: assertStringArray(o['tags'], `captures[${i}].tags`),
    notes: assertOptionalString(o['notes'], `captures[${i}].notes`, 100_000),
    userAgent: assertString(o['userAgent'], `captures[${i}].userAgent`, 1000),
    viewportWidth: assertFiniteNumber(
      o['viewportWidth'],
      `captures[${i}].viewportWidth`,
    ),
    viewportHeight: assertFiniteNumber(
      o['viewportHeight'],
      `captures[${i}].viewportHeight`,
    ),
    devicePixelRatio: assertFiniteNumber(
      o['devicePixelRatio'],
      `captures[${i}].devicePixelRatio`,
    ),
  };
}

function validateExportedTag(t: unknown, i: number): ExportedTag {
  if (typeof t !== 'object' || t === null)
    throw new Error(`Invalid tag at index ${i}.`);
  const o = t as Record<string, unknown>;
  return {
    id: assertInt(o['id'], `tags[${i}].id`),
    name: assertString(o['name'], `tags[${i}].name`, 200),
    color: assertOptionalString(o['color'], `tags[${i}].color`, 50),
    usageCount: assertInt(o['usageCount'], `tags[${i}].usageCount`),
  };
}

function parseKapturFile(text: string): KapturFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Unreadable .kaptur file (invalid JSON).');
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid .kaptur file.');
  }
  const file = data as Record<string, unknown>;
  if (file['format'] !== KAPTUR_FORMAT) {
    throw new Error('This file is not a Kaptur export.');
  }
  if (
    typeof file['version'] !== 'number' ||
    !SUPPORTED_VERSIONS.has(file['version'])
  ) {
    throw new Error(
      `Unsupported export version: ${String(file['version'])} (expected ${KAPTUR_VERSION}).`,
    );
  }
  if (
    !Array.isArray(file['sessions']) ||
    !Array.isArray(file['captures']) ||
    !Array.isArray(file['tags'])
  ) {
    throw new Error('Corrupted .kaptur file (missing sections).');
  }
  if (
    file['sessions'].length > MAX_ITEMS ||
    file['captures'].length > MAX_ITEMS ||
    file['tags'].length > MAX_ITEMS
  ) {
    throw new Error('Corrupted .kaptur file (sections exceed size limit).');
  }

  const sessions = (file['sessions'] as unknown[]).map(validateExportedSession);
  const captures = (file['captures'] as unknown[]).map(validateExportedCapture);
  const tags = (file['tags'] as unknown[]).map(validateExportedTag);
  const KNOWN_SETTING_KEYS = new Set([
    'export.fileNameTemplate',
    'banner.locale',
  ]);
  const settings: AppSetting[] = Array.isArray(file['settings'])
    ? (file['settings'] as unknown[]).flatMap((s) => {
        if (typeof s !== 'object' || s === null) return [];
        const o = s as Record<string, unknown>;
        if (typeof o['key'] !== 'string' || !KNOWN_SETTING_KEYS.has(o['key']))
          return [];
        return [{ key: o['key'], value: o['value'] }];
      })
    : [];

  return {
    format: KAPTUR_FORMAT,
    version: file['version'] as number,
    exportedAt:
      typeof file['exportedAt'] === 'string'
        ? file['exportedAt']
        : new Date().toISOString(),
    counts: {
      sessions: sessions.length,
      captures: captures.length,
      tags: tags.length,
    },
    sessions,
    captures,
    tags,
    settings,
  };
}

async function deserializeCapture(c: ExportedCapture): Promise<Capture> {
  const [imageBlob, rawImageBlob, thumbnailBlob] = await Promise.all([
    dataUrlToBlob(c.imageBlob),
    dataUrlToBlob(c.rawImageBlob),
    dataUrlToBlob(c.thumbnailBlob),
  ]);
  return {
    id: c.id,
    sessionId: c.sessionId,
    customName: c.customName,
    url: c.url,
    domain: c.domain,
    pageTitle: c.pageTitle,
    capturedAt: new Date(c.capturedAt),
    captureType: c.captureType,
    imageBlob,
    rawImageBlob,
    thumbnailBlob,
    rawHash: c.rawHash,
    finalHash: c.finalHash,
    htmlHash: c.htmlHash,
    width: c.width,
    height: c.height,
    annotationJson: c.annotationJson,
    htmlContent: c.htmlContent,
    htmlSize: c.htmlSize,
    tags: c.tags,
    notes: c.notes,
    userAgent: c.userAgent,
    viewportWidth: c.viewportWidth,
    viewportHeight: c.viewportHeight,
    devicePixelRatio: c.devicePixelRatio,
  };
}

function deserializeSession(s: ExportedSession): Session {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    createdAt: new Date(s.createdAt),
    updatedAt: new Date(s.updatedAt),
    color: s.color,
    archivedAt: s.archivedAt ? new Date(s.archivedAt) : undefined,
    captureCount: s.captureCount,
  };
}

function deserializeTag(t: ExportedTag): Tag {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    usageCount: t.usageCount,
  };
}

export async function importKapturFile(file: File): Promise<ImportSummary> {
  const text = await file.text();
  const parsed = parseKapturFile(text);

  const captures = await Promise.all(parsed.captures.map(deserializeCapture));
  const sessions = parsed.sessions.map(deserializeSession);
  const tags = parsed.tags.map(deserializeTag);

  await db.transaction(
    'rw',
    [db.sessions, db.captures, db.tags, db.settings],
    async () => {
      await Promise.all([
        db.captures.clear(),
        db.sessions.clear(),
        db.tags.clear(),
        db.settings.clear(),
      ]);
      if (sessions.length > 0) {
        await db.sessions.bulkAdd(
          sessions.map((s) => ({ ...s, captureCount: 0 })),
        );
      }
      if (captures.length > 0) await db.captures.bulkAdd(captures);
      if (tags.length > 0) await db.tags.bulkAdd(tags);
      if (parsed.settings.length > 0)
        await db.settings.bulkAdd(parsed.settings);
    },
  );

  await db.transaction('rw', db.sessions, db.captures, async () => {
    const allSessions = await db.sessions.toArray();
    for (const s of allSessions) {
      if (s.id === undefined) continue;
      const count = await db.captures.where('sessionId').equals(s.id).count();
      if (count !== s.captureCount) {
        await db.sessions.update(s.id, { captureCount: count });
      }
    }
  });

  await rebuildIndex();

  return {
    sessions: sessions.length,
    captures: captures.length,
    tags: tags.length,
  };
}
