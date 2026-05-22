import MiniSearch from 'minisearch';
import { db, type Capture } from '@/lib/db/schema';
import { getSessionBySlug } from '@/lib/db/queries';
import { parseQuery, type ParsedQuery } from './query-parser';

export interface IndexedCapture {
  id: number;
  sessionId: number;
  customName: string;
  url: string;
  pageTitle: string;
  domain: string;
  notes: string;
  tags: string;
}

export interface CaptureSearchResult {
  id: number;
  sessionId: number;
  customName: string;
  url: string;
  pageTitle: string;
  domain: string;
  score: number;
  terms: string[];
  htmlSnippet?: string;
  matchSource?: 'index' | 'html' | 'media' | 'html+media';
}

const searchIndex = new MiniSearch<IndexedCapture>({
  fields: ['customName', 'pageTitle', 'url', 'domain', 'notes', 'tags'],
  storeFields: ['id', 'sessionId', 'customName', 'url', 'pageTitle', 'domain'],
  searchOptions: {
    boost: { customName: 3, pageTitle: 2, tags: 2 },
    fuzzy: 0.2,
    prefix: true,
  },
});

let initialized = false;

function captureToIndexed(c: Capture): IndexedCapture | null {
  if (c.id === undefined) return null;
  return {
    id: c.id,
    sessionId: c.sessionId,
    customName: c.customName,
    url: c.url,
    pageTitle: c.pageTitle,
    domain: c.domain,
    notes: c.notes ?? '',
    tags: c.tags.join(' '),
  };
}

export async function initSearchIndex(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await rebuildIndex();

  db.captures.hook('creating', function (_pk, obj) {
    this.onsuccess = (primKey) => {
      const indexed = captureToIndexed({
        ...(obj as Capture),
        id: primKey as number,
      });
      if (indexed) searchIndex.add(indexed);
    };
  });

  db.captures.hook('updating', function (mods, primKey, obj) {
    const merged = {
      ...(obj as Capture),
      ...(mods as Partial<Capture>),
      id: primKey as number,
    } as Capture;
    this.onsuccess = () => {
      if (searchIndex.has(merged.id as number)) {
        searchIndex.discard(merged.id as number);
      }
      const indexed = captureToIndexed(merged);
      if (indexed) searchIndex.add(indexed);
    };
  });

  db.captures.hook('deleting', function (primKey) {
    if (searchIndex.has(primKey as number)) {
      searchIndex.discard(primKey as number);
    }
  });
}

export async function rebuildIndex(): Promise<void> {
  const all = await db.captures.toArray();
  searchIndex.removeAll();
  const indexed = all
    .map(captureToIndexed)
    .filter((x): x is IndexedCapture => x !== null);
  searchIndex.addAll(indexed);
}

function extractSnippet(html: string, keyword: string, radius = 100): string {
  const lc = html.toLowerCase();
  const kwLc = keyword.toLowerCase();
  const idx = lc.indexOf(kwLc);
  if (idx === -1) return '';
  const start = Math.max(0, idx - radius);
  const end = Math.min(html.length, idx + kwLc.length + radius);
  return (
    (start > 0 ? '…' : '') +
    html.slice(start, end) +
    (end < html.length ? '…' : '')
  );
}

async function scanHtml(keyword: string): Promise<Map<number, string>> {
  if (keyword.length < 3) return new Map();
  const kwLc = keyword.toLowerCase();
  const result = new Map<number, string>();
  await db.captures
    .filter(
      (c) =>
        !!c.id && !!c.htmlContent && c.htmlContent.toLowerCase().includes(kwLc),
    )
    .each((c) => result.set(c.id!, extractSnippet(c.htmlContent!, keyword)));
  return result;
}

async function scanMedia(keyword: string): Promise<Set<number>> {
  if (keyword.length < 3) return new Set();
  const kwLc = keyword.toLowerCase();
  const ids = new Set<number>();
  await db.media
    .filter((m) => m.url.toLowerCase().includes(kwLc))
    .each((m) => ids.add(m.captureId));
  return ids;
}

export async function searchCaptures(
  raw: string,
  limit: number = 20,
): Promise<{ parsed: ParsedQuery; results: CaptureSearchResult[] }> {
  const parsed = parseQuery(raw);

  let candidates: Array<{
    indexed: IndexedCapture;
    score: number;
    terms: string[];
  }>;

  if (parsed.text.length > 0) {
    const matches = searchIndex.search(parsed.text);
    candidates = matches.map((m) => ({
      indexed: {
        id: m['id'] as number,
        sessionId: m['sessionId'] as number,
        customName: m['customName'] as string,
        url: m['url'] as string,
        pageTitle: m['pageTitle'] as string,
        domain: m['domain'] as string,
        notes: '',
        tags: '',
      },
      score: m.score,
      terms: m.terms,
    }));
  } else {
    const all = await db.captures.toArray();
    candidates = all
      .map(captureToIndexed)
      .filter((x): x is IndexedCapture => x !== null)
      .map((indexed) => ({ indexed, score: 0, terms: [] }));
  }

  let sessionIdFilter: number | undefined;
  if (parsed.sessionSlug) {
    const session = await getSessionBySlug(parsed.sessionSlug);
    sessionIdFilter = session?.id;
    if (sessionIdFilter === undefined) {
      return { parsed, results: [] };
    }
  }

  const tagLc = parsed.tag?.toLowerCase();
  const domainLc = parsed.domain?.toLowerCase();

  const filtered = candidates.filter(({ indexed }) => {
    if (
      sessionIdFilter !== undefined &&
      indexed.sessionId !== sessionIdFilter
    ) {
      return false;
    }
    if (domainLc && !indexed.domain.toLowerCase().includes(domainLc)) {
      return false;
    }
    if (tagLc) {
      const tagsLc = indexed.tags.toLowerCase().split(/\s+/);
      if (!tagsLc.some((t) => t === tagLc)) return false;
    }
    return true;
  });

  let htmlMatches: Map<number, string> | null = null;
  let mediaMatches: Set<number> | null = null;
  if (parsed.htmlKeyword) htmlMatches = await scanHtml(parsed.htmlKeyword);
  if (parsed.mediaKeyword) mediaMatches = await scanMedia(parsed.mediaKeyword);

  let finalCandidates = filtered;
  if (htmlMatches !== null || mediaMatches !== null) {
    finalCandidates = filtered.filter(({ indexed }) => {
      if (htmlMatches !== null && !htmlMatches.has(indexed.id)) return false;
      if (mediaMatches !== null && !mediaMatches.has(indexed.id)) return false;
      return true;
    });
  }

  return {
    parsed,
    results: finalCandidates
      .slice(0, limit)
      .map(({ indexed, score, terms }) => {
        const hasHtml = htmlMatches?.has(indexed.id) ?? false;
        const hasMedia = mediaMatches?.has(indexed.id) ?? false;
        const matchSource: CaptureSearchResult['matchSource'] =
          hasHtml && hasMedia
            ? 'html+media'
            : hasHtml
              ? 'html'
              : hasMedia
                ? 'media'
                : parsed.text.length > 0
                  ? 'index'
                  : undefined;
        return {
          id: indexed.id,
          sessionId: indexed.sessionId,
          customName: indexed.customName,
          url: indexed.url,
          pageTitle: indexed.pageTitle,
          domain: indexed.domain,
          score,
          terms,
          htmlSnippet: htmlMatches?.get(indexed.id),
          matchSource,
        };
      }),
  };
}
