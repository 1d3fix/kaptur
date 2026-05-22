import { db, type Capture, type CapturedMedia, type Session } from './schema';

export async function getAllSessions(opts?: {
  includeArchived?: boolean;
}): Promise<Session[]> {
  const includeArchived = opts?.includeArchived ?? false;
  let coll = db.sessions.orderBy('createdAt').reverse();
  if (!includeArchived) {
    coll = coll.filter((s) => !s.archivedAt);
  }
  return coll.toArray();
}

export async function getSessionById(id: number): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export async function getSessionBySlug(
  slug: string,
): Promise<Session | undefined> {
  return db.sessions.where('slug').equals(slug).first();
}

export async function getActiveCaptureCount(
  sessionId: number,
): Promise<number> {
  return db.captures.where('sessionId').equals(sessionId).count();
}

export async function getCapturesForSession(
  sessionId: number,
): Promise<Capture[]> {
  return db.captures.where('sessionId').equals(sessionId).toArray();
}

export async function getCaptureById(id: number): Promise<Capture | undefined> {
  return db.captures.get(id);
}

export async function getMediaForCapture(
  captureId: number,
): Promise<CapturedMedia[]> {
  return db.media.where('captureId').equals(captureId).toArray();
}
