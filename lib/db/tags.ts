import { db, type Tag } from './schema';

function normalize(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

export async function getAllTags(): Promise<Tag[]> {
  const all = await db.tags.toArray();
  return all.sort((a, b) => b.usageCount - a.usageCount);
}

export async function getTagsByPrefix(prefix: string): Promise<Tag[]> {
  const lower = prefix.trim().toLowerCase();
  if (!lower) return getAllTags();
  const all = await db.tags.toArray();
  return all
    .filter((t) => t.name.toLowerCase().includes(lower))
    .sort((a, b) => b.usageCount - a.usageCount);
}

export async function setCaptureTags(
  captureId: number,
  newTags: string[],
): Promise<void> {
  const cleaned = [
    ...new Set(newTags.map(normalize).filter((t) => t.length > 0)),
  ];
  await db.transaction('rw', db.captures, db.tags, async () => {
    const capture = await db.captures.get(captureId);
    if (!capture) return;
    const old = new Set(capture.tags);
    const next = new Set(cleaned);

    // Added
    for (const name of next) {
      if (old.has(name)) continue;
      const existing = await db.tags.where('name').equals(name).first();
      if (existing && existing.id !== undefined) {
        await db.tags.update(existing.id, {
          usageCount: existing.usageCount + 1,
        });
      } else {
        await db.tags.add({ name, usageCount: 1 });
      }
    }

    // Removed
    for (const name of old) {
      if (next.has(name)) continue;
      const existing = await db.tags.where('name').equals(name).first();
      if (!existing || existing.id === undefined) continue;
      const newCount = existing.usageCount - 1;
      if (newCount <= 0) {
        await db.tags.delete(existing.id);
      } else {
        await db.tags.update(existing.id, { usageCount: newCount });
      }
    }

    await db.captures.update(captureId, { tags: cleaned });
  });
}

export async function renameTag(id: number, newName: string): Promise<void> {
  const target = normalize(newName);
  if (!target) return;

  await db.transaction('rw', db.tags, db.captures, async () => {
    const tag = await db.tags.get(id);
    if (!tag || tag.id === undefined) return;
    const oldName = tag.name;
    if (oldName === target) return;

    const captures = await db.captures.where('tags').anyOf([oldName]).toArray();

    const existing = await db.tags.where('name').equals(target).first();

    if (existing && existing.id !== undefined && existing.id !== id) {
      // Merge: combine old into existing
      for (const c of captures) {
        if (c.id === undefined) continue;
        const next = c.tags.filter((t) => t !== oldName);
        if (!next.includes(target)) next.push(target);
        await db.captures.update(c.id, { tags: next });
      }
      await db.tags.update(existing.id, {
        usageCount: existing.usageCount + tag.usageCount,
      });
      await db.tags.delete(tag.id);
      return;
    }

    // Plain rename
    for (const c of captures) {
      if (c.id === undefined) continue;
      const next = c.tags.map((t) => (t === oldName ? target : t));
      await db.captures.update(c.id, { tags: next });
    }
    await db.tags.update(tag.id, { name: target });
  });
}

export async function deleteTag(id: number): Promise<void> {
  await db.transaction('rw', db.tags, db.captures, async () => {
    const tag = await db.tags.get(id);
    if (!tag || tag.id === undefined) return;
    const captures = await db.captures
      .where('tags')
      .anyOf([tag.name])
      .toArray();
    for (const c of captures) {
      if (c.id === undefined) continue;
      const next = c.tags.filter((t) => t !== tag.name);
      await db.captures.update(c.id, { tags: next });
    }
    await db.tags.delete(tag.id);
  });
}

export { normalize as normalizeTagName };
