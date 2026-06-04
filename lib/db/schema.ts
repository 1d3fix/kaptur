import Dexie, { type Table } from 'dexie';

export interface Session {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  archivedAt?: Date;
  captureCount: number;
}

export interface Capture {
  id?: number;
  sessionId: number;
  customName: string;
  url: string;
  domain: string;
  pageTitle: string;
  capturedAt: Date;
  captureType: 'visible' | 'region' | 'full-page';

  imageBlob: Blob;
  rawImageBlob: Blob;
  thumbnailBlob: Blob;

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

  mirroredAt?: Date;
  mirrorPath?: string;

  mediaCollectedAt?: Date;
}

export type MediaFetchStatus =
  | 'pending'
  | 'ok'
  | 'cors_error'
  | 'fetch_error'
  | 'skipped'
  | 'too_large';

export interface CapturedMedia {
  id?: number;
  captureId: number;
  url: string;
  type: 'image' | 'video' | 'audio';
  mimeType?: string;
  alt?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  blob?: Blob;
  sha256?: string;
  exif?: string;
  fetchStatus: MediaFetchStatus;
  fetchError?: string;
  size?: number;
  fetchedAt: Date;
}

export interface Tag {
  id?: number;
  name: string;
  color?: string;
  usageCount: number;
}

export interface AppSetting {
  key: string;
  value: unknown;
}

export class KapturDB extends Dexie {
  sessions!: Table<Session, number>;
  captures!: Table<Capture, number>;
  media!: Table<CapturedMedia, number>;
  tags!: Table<Tag, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('kaptur');
    this.version(1).stores({
      sessions: '++id, slug, createdAt, archivedAt',
      captures:
        '++id, sessionId, capturedAt, domain, url, rawHash, *tags, [sessionId+capturedAt]',
      networkLogs: '++id, captureId, [captureId+timestamp]',
      tags: '++id, &name',
      settings: '&key',
    });

    this.version(2).stores({
      networkLogs: null,
    });

    this.version(3).stores({
      media: '++id, captureId',
    });

    this.sessions.hook('creating', function (_pk, obj) {
      const now = new Date();
      if (!obj.createdAt) obj.createdAt = now;
      obj.updatedAt = now;
      if (obj.captureCount === undefined) obj.captureCount = 0;
    });

    this.sessions.hook('updating', function (mods) {
      return { ...(mods as Partial<Session>), updatedAt: new Date() };
    });
  }
}

export const db = new KapturDB();
