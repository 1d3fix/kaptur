import { useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchCaptures, type CaptureSearchResult } from '@/lib/search';
import type { ParsedQuery } from '@/lib/search/query-parser';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CaptureSearchResult[]>([]);
  const [parsed, setParsed] = useState<ParsedQuery>({ text: '' });
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(0);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void searchCaptures(query, 30)
      .then((res) => {
        if (cancelled) return;
        setResults(res.results);
        setParsed(res.parsed);
        setSelected(0);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[Kaptur] search failed', err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (parsed.sessionSlug) filters.push(`session:${parsed.sessionSlug}`);
    if (parsed.domain) filters.push(`domain:${parsed.domain}`);
    if (parsed.tag) filters.push(`tag:${parsed.tag}`);
    if (parsed.htmlKeyword) filters.push(`html:${parsed.htmlKeyword}`);
    if (parsed.mediaKeyword) filters.push(`media:${parsed.mediaKeyword}`);
    return filters;
  }, [parsed]);

  const queryTriggersScanning = /\b(html|media):/.test(query);

  function openCapture(id: number) {
    onOpenChange(false);
    void navigate({ to: '/captures/$id', params: { id: String(id) } });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[selected];
      if (hit) openCapture(hit.id);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[15%] z-50 grid w-full max-w-xl -translate-x-1/2 gap-0 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            Recherche
          </DialogPrimitive.Title>

          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search… (session:slug domain:foo tag:bar html:keyword media:keyword)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              Esc
            </kbd>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2 text-xs">
              <span className="text-muted-foreground">Filters:</span>
              {activeFilters.map((f) => (
                <span
                  key={f}
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[11px]',
                    f.startsWith('html:') || f.startsWith('media:')
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  {f}
                </span>
              ))}
            </div>
          )}

          <div className="max-h-[420px] overflow-auto">
            {loading && results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {queryTriggersScanning ? 'Scanning database…' : 'Searching…'}
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {query.trim() === ''
                  ? 'Type to search across captures.'
                  : 'No result.'}
              </p>
            ) : (
              <ul role="listbox">
                {results.map((r, idx) => (
                  <SearchHitItem
                    key={r.id}
                    hit={r}
                    active={idx === selected}
                    parsedQuery={parsed}
                    onHover={() => setSelected(idx)}
                    onClick={() => openCapture(r.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="rounded border bg-background px-1 font-mono">
                  ↑↓
                </kbd>{' '}
                navigate
              </span>
              <span>
                <kbd className="rounded border bg-background px-1 font-mono">
                  ⏎
                </kbd>{' '}
                open
              </span>
            </div>
            <span>
              {results.length} result{results.length > 1 ? 's' : ''}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface HitProps {
  hit: CaptureSearchResult;
  active: boolean;
  parsedQuery: ParsedQuery;
  onHover: () => void;
  onClick: () => void;
}

function SearchHitItem({
  hit,
  active,
  parsedQuery,
  onHover,
  onClick,
}: HitProps) {
  return (
    <li
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-b-0',
        active ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="truncate text-sm font-medium">
            <Highlight text={hit.customName} terms={hit.terms} />
          </div>
          {hit.matchSource && hit.matchSource !== 'index' && (
            <span className="shrink-0 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-400">
              {hit.matchSource}
            </span>
          )}
        </div>
        <div className="flex gap-2 truncate text-xs text-muted-foreground">
          <span className="font-mono">{hit.domain || '—'}</span>
          <span>·</span>
          <span className="truncate">
            <Highlight text={hit.url} terms={hit.terms} />
          </span>
        </div>
        {hit.htmlSnippet && (
          <div className="mt-1.5 truncate rounded bg-muted px-2 py-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
            <Highlight
              text={hit.htmlSnippet}
              terms={parsedQuery.htmlKeyword ? [parsedQuery.htmlKeyword] : []}
            />
          </div>
        )}
      </div>
      <ArrowRight
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-opacity',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
    </li>
  );
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  const escaped = terms
    .filter((t) => t.length > 0)
    .map(escapeRegExp)
    .join('|');
  if (!escaped) return <>{text}</>;
  const re = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-300/40 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
