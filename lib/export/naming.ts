import type { Capture, Session } from '@/lib/db/schema';

export interface FilenameContext {
  capture: Capture;
  session?: Session;
  index: number; // 1-based ordinal within the export
}

export interface TokenDoc {
  token: string;
  description: string;
  example: string;
}

export const AVAILABLE_TOKENS: TokenDoc[] = [
  {
    token: '{index}',
    description: 'Capture order (3 digits, zero-padded)',
    example: '003',
  },
  {
    token: '{timestamp}',
    description: 'Date + time, filesystem-safe',
    example: '2026-05-15_14-32-15',
  },
  { token: '{date}', description: 'ISO date', example: '2026-05-15' },
  {
    token: '{time}',
    description: 'Time (safe separators)',
    example: '14-32-15',
  },
  {
    token: '{name}',
    description: 'Custom name of the capture (sanitized)',
    example: 'financial-report',
  },
  {
    token: '{domain}',
    description: 'Page domain',
    example: 'wikipedia-org',
  },
  {
    token: '{session}',
    description: 'Session slug',
    example: 'investigation-1',
  },
  { token: '{type}', description: 'Capture type', example: 'visible' },
  {
    token: '{hash}',
    description: 'SHA-256 hash (first 8 chars of finalHash)',
    example: 'a3f1b2c4',
  },
];

function stripUnsafe(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    // ASCII control chars
    if (ch < 0x20 || ch === 0x7f) continue;
    const c = value[i]!;
    // Reserved filesystem chars
    if ('<>:"/\\|?*'.includes(c)) {
      out += '_';
    } else {
      out += c;
    }
  }
  return out;
}

export function sanitizeFsSegment(value: string): string {
  const stripped = stripUnsafe(value).replace(/\s+/g, '-');
  return (
    stripped
      .replace(/^[\s._-]+/g, '')
      .replace(/[\s._-]+$/g, '')
      .slice(0, 80) || 'untitled'
  );
}

function pad(n: number, width = 3): string {
  return String(n).padStart(width, '0');
}

function formatDateParts(d: Date): {
  date: string;
  time: string;
  timestamp: string;
} {
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1, 2);
  const dd = pad(d.getDate(), 2);
  const hh = pad(d.getHours(), 2);
  const mi = pad(d.getMinutes(), 2);
  const ss = pad(d.getSeconds(), 2);
  const date = `${yyyy}-${mm}-${dd}`;
  const time = `${hh}-${mi}-${ss}`;
  return { date, time, timestamp: `${date}_${time}` };
}

export function resolveTokens(ctx: FilenameContext): Record<string, string> {
  const { capture, session, index } = ctx;
  const dp = formatDateParts(capture.capturedAt);
  return {
    index: pad(index),
    timestamp: dp.timestamp,
    date: dp.date,
    time: dp.time,
    name: sanitizeFsSegment(capture.customName),
    domain: sanitizeFsSegment(capture.domain || ''),
    session: sanitizeFsSegment(session?.slug ?? ''),
    type: capture.captureType,
    hash: capture.finalHash.slice(0, 8),
  };
}

export function applyTemplate(
  template: string,
  tokens: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in tokens ? tokens[key]! : match,
  );
}

export function formatFilename(template: string, ctx: FilenameContext): string {
  const tokens = resolveTokens(ctx);
  const base = applyTemplate(template, tokens);
  const segments = base
    .split('/')
    .map((seg) => sanitizeFsSegment(seg))
    .filter((seg) => seg.length > 0 && seg !== 'untitled');
  const path =
    segments.length > 0 ? segments.join('/') : `capture-${pad(ctx.index)}`;
  return `${path}.png`;
}

/**
 * Build filenames for a list of captures, disambiguating any collisions by
 * appending -2, -3, ... to duplicates.
 */
export function uniquifyFilenames(filenames: string[]): string[] {
  const seen = new Map<string, number>();
  return filenames.map((name) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf('.');
    if (dot < 0) return `${name}-${count + 1}`;
    return `${name.slice(0, dot)}-${count + 1}${name.slice(dot)}`;
  });
}
