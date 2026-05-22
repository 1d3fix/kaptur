import { slugify } from '@/lib/utils/slug';
import { extractDomain } from '@/lib/utils/url';
import { db, type Capture, type CapturedMedia, type Session } from './schema';

export interface CreateSessionInput {
  name: string;
  description?: string;
  color?: string;
}

export async function createSession(
  input: CreateSessionInput,
): Promise<number> {
  const baseSlug = slugify(input.name) || 'session';
  const slug = await uniqueSlug(baseSlug);

  const id = await db.sessions.add({
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || undefined,
    color: input.color,
    createdAt: new Date(),
    updatedAt: new Date(),
    captureCount: 0,
  });

  return id;
}

export async function updateSession(
  id: number,
  patch: Partial<Pick<Session, 'name' | 'description' | 'color'>>,
): Promise<void> {
  const next: Partial<Session> = { ...patch };
  if (patch.name !== undefined) {
    const current = await db.sessions.get(id);
    if (current && slugify(patch.name) !== slugify(current.name)) {
      const baseSlug = slugify(patch.name) || 'session';
      next.slug = await uniqueSlug(baseSlug, id);
    }
  }
  await db.sessions.update(id, next);
}

export async function archiveSession(id: number): Promise<void> {
  await db.sessions.update(id, { archivedAt: new Date() });
}

export async function unarchiveSession(id: number): Promise<void> {
  await db.sessions.update(id, { archivedAt: undefined });
}

export async function deleteSession(id: number): Promise<void> {
  await db.transaction('rw', db.sessions, db.captures, db.media, async () => {
    const captureIds = await db.captures
      .where('sessionId')
      .equals(id)
      .primaryKeys();
    if (captureIds.length > 0) {
      await db.media.where('captureId').anyOf(captureIds).delete();
      await db.captures.bulkDelete(captureIds);
    }
    await db.sessions.delete(id);
  });
}

export type CreateCaptureInput = Omit<
  Capture,
  'id' | 'capturedAt' | 'domain' | 'tags'
> & {
  capturedAt?: Date;
  tags?: string[];
};

export async function createCapture(
  input: CreateCaptureInput,
): Promise<number> {
  return db.transaction('rw', db.captures, db.sessions, async () => {
    const id = await db.captures.add({
      ...input,
      domain: extractDomain(input.url),
      capturedAt: input.capturedAt ?? new Date(),
      tags: input.tags ?? [],
    });
    const session = await db.sessions.get(input.sessionId);
    if (session && session.id !== undefined) {
      await db.sessions.update(session.id, {
        captureCount: (session.captureCount ?? 0) + 1,
      });
    }
    return id;
  });
}

export interface UpdateCaptureInput {
  customName?: string;
  notes?: string;
  tags?: string[];
}

export async function updateCapture(
  id: number,
  patch: UpdateCaptureInput,
): Promise<void> {
  await db.captures.update(id, patch as Partial<Capture>);
}

export async function deleteCapture(id: number): Promise<void> {
  await db.transaction('rw', db.captures, db.sessions, db.media, async () => {
    const capture = await db.captures.get(id);
    await db.media.where('captureId').equals(id).delete();
    await db.captures.delete(id);
    if (capture) {
      const session = await db.sessions.get(capture.sessionId);
      if (session && session.id !== undefined) {
        await db.sessions.update(session.id, {
          captureCount: Math.max(0, (session.captureCount ?? 0) - 1),
        });
      }
    }
  });
}

export async function saveMediaItems(
  captureId: number,
  items: Array<Omit<CapturedMedia, 'id' | 'captureId'>>,
): Promise<void> {
  if (items.length === 0) return;
  await db.media.bulkAdd(items.map((item) => ({ ...item, captureId })));
}

export async function markMediaCollected(captureId: number): Promise<void> {
  await db.captures.update(captureId, { mediaCollectedAt: new Date() });
}

export async function updateMediaItem(
  id: number,
  patch: Partial<Omit<CapturedMedia, 'id' | 'captureId'>>,
): Promise<void> {
  await db.media.update(id, patch as Partial<CapturedMedia>);
}

export async function deleteCaptures(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await db.transaction('rw', db.captures, db.sessions, db.media, async () => {
    const captures = await db.captures.bulkGet(ids);
    const sessionDelta = new Map<number, number>();
    for (const capture of captures) {
      if (!capture) continue;
      sessionDelta.set(
        capture.sessionId,
        (sessionDelta.get(capture.sessionId) ?? 0) + 1,
      );
    }
    await db.media.where('captureId').anyOf(ids).delete();
    await db.captures.bulkDelete(ids);
    for (const [sessionId, n] of sessionDelta) {
      const session = await db.sessions.get(sessionId);
      if (session && session.id !== undefined) {
        await db.sessions.update(session.id, {
          captureCount: Math.max(0, (session.captureCount ?? 0) - n),
        });
      }
    }
  });
}

export async function moveCapturesToSession(
  captureIds: number[],
  targetSessionId: number,
): Promise<number> {
  if (captureIds.length === 0) return 0;
  let moved = 0;
  await db.transaction('rw', db.captures, db.sessions, async () => {
    const captures = await db.captures.bulkGet(captureIds);
    const sourceDelta = new Map<number, number>();
    const updates: { id: number; sessionId: number }[] = [];
    for (const capture of captures) {
      if (!capture || capture.id === undefined) continue;
      if (capture.sessionId === targetSessionId) continue;
      sourceDelta.set(
        capture.sessionId,
        (sourceDelta.get(capture.sessionId) ?? 0) + 1,
      );
      updates.push({ id: capture.id, sessionId: targetSessionId });
    }
    const updateIds = updates.map((u) => u.id);
    await db.captures
      .where('id')
      .anyOf(updateIds)
      .modify({ sessionId: targetSessionId });
    moved = updates.length;
    for (const [sourceId, n] of sourceDelta) {
      const src = await db.sessions.get(sourceId);
      if (src) {
        await db.sessions.update(sourceId, {
          captureCount: Math.max(0, (src.captureCount ?? 0) - n),
        });
      }
    }
    if (moved > 0) {
      const target = await db.sessions.get(targetSessionId);
      if (target) {
        await db.sessions.update(targetSessionId, {
          captureCount: (target.captureCount ?? 0) + moved,
        });
      }
    }
  });
  return moved;
}

async function uniqueSlug(base: string, ignoreId?: number): Promise<string> {
  let candidate = base;
  let i = 2;
  while (true) {
    const existing = await db.sessions.where('slug').equals(candidate).first();
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${i++}`;
  }
}
