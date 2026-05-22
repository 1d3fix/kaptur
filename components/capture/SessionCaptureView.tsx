import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRightLeft,
  Download,
  LayoutGrid,
  List,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { deleteCaptures, moveCapturesToSession } from '@/lib/db/mutations';
import {
  getAllSessions,
  getCapturesForSession,
  getSessionBySlug,
} from '@/lib/db/queries';
import { exportCapturesToZip } from '@/lib/export/zip';
import { sessionDetailRoute } from '@/entrypoints/app/routes';
import type { Capture } from '@/lib/db/schema';
import { CaptureFilters, type CaptureFiltersState } from './CaptureFilters';
import { CaptureGrid } from './CaptureGrid';

type SortMode = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

const SORT_LABEL: Record<SortMode, string> = {
  date_desc: 'Date (newest → oldest)',
  date_asc: 'Date (oldest → newest)',
  name_asc: 'Name (A → Z)',
  name_desc: 'Name (Z → A)',
};

export function SessionCaptureView() {
  const { slug } = sessionDetailRoute.useParams();
  const session = useLiveQuery(() => getSessionBySlug(slug), [slug]);
  const captures = useLiveQuery(
    () => (session?.id ? getCapturesForSession(session.id) : []),
    [session?.id],
  );
  const allSessions = useLiveQuery(() =>
    getAllSessions({ includeArchived: false }),
  );

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<SortMode>('date_desc');
  const [filters, setFilters] = useState<CaptureFiltersState>({
    domains: [],
    tags: [],
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [moveTarget, setMoveTarget] = useState<string>('');

  const domains = useMemo(() => {
    if (!captures) return [];
    const set = new Set<string>();
    for (const c of captures) if (c.domain) set.add(c.domain);
    return [...set].sort();
  }, [captures]);

  const tags = useMemo(() => {
    if (!captures) return [];
    const set = new Set<string>();
    for (const c of captures) for (const t of c.tags) set.add(t);
    return [...set].sort();
  }, [captures]);

  const filteredCaptures = useMemo(() => {
    if (!captures) return [];
    const fromTs = filters.fromDate
      ? new Date(filters.fromDate).getTime()
      : null;
    const toTs = filters.toDate
      ? new Date(filters.toDate).getTime() + 24 * 60 * 60 * 1000
      : null;
    const filtered = captures.filter((c) => {
      const ts = c.capturedAt.getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts >= toTs) return false;
      if (filters.domains.length > 0 && !filters.domains.includes(c.domain)) {
        return false;
      }
      if (
        filters.tags.length > 0 &&
        !filters.tags.every((t) => c.tags.includes(t))
      ) {
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'date_desc':
          return b.capturedAt.getTime() - a.capturedAt.getTime();
        case 'date_asc':
          return a.capturedAt.getTime() - b.capturedAt.getTime();
        case 'name_asc':
          return a.customName.localeCompare(b.customName);
        case 'name_desc':
          return b.customName.localeCompare(a.customName);
      }
    });
  }, [captures, filters, sort]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleDeleteSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Delete ${ids.length} capture${ids.length > 1 ? 's' : ''}? This action is irreversible.`,
    );
    if (!ok) return;
    await deleteCaptures(ids);
    clearSelection();
    toast.success(`${ids.length} capture(s) deleted.`);
  }

  async function handleMove() {
    const targetId = Number(moveTarget);
    if (!Number.isFinite(targetId)) return;
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const moved = await moveCapturesToSession(ids, targetId);
    clearSelection();
    setMoveTarget('');
    toast.success(`${moved} capture(s) moved.`);
  }

  async function handleExportZip(subset: Capture[]) {
    if (subset.length === 0) {
      toast.error('No captures to export.');
      return;
    }
    const ordered = [...subset].sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
    );
    const t = toast.loading(`Preparing export (${ordered.length})…`, {
      duration: Infinity,
    });
    try {
      const summary = await exportCapturesToZip({
        captures: ordered,
        session: session ?? undefined,
      });
      toast.dismiss(t);
      toast.success(
        `${summary.fileCount} capture(s) exported → ${summary.zipFileName}`,
      );
    } catch (err) {
      toast.dismiss(t);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function exportSelected() {
    if (!captures) return;
    const subset = captures.filter(
      (c) => c.id !== undefined && selectedIds.has(c.id),
    );
    void handleExportZip(subset);
  }

  function exportAllOfSession() {
    if (!captures) return;
    void handleExportZip(captures);
  }

  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link to="/sessions">
            <ArrowLeft className="mr-1 h-4 w-4" />
            All sessions
          </Link>
        </Button>
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Session not found.
        </div>
      </div>
    );
  }

  const otherSessions = (allSessions ?? []).filter((s) => s.id !== session.id);
  const hasSelection = selectedIds.size > 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link to="/sessions">
            <ArrowLeft className="mr-1 h-4 w-4" />
            All sessions
          </Link>
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: session.color ?? 'transparent' }}
            />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {session.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {captures?.length ?? 0} capture
                {(captures?.length ?? 0) > 1 ? 's' : ''} ·{' '}
                {format(session.createdAt, 'MMM d, yyyy')}
                {session.archivedAt && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                    archived
                  </span>
                )}
              </p>
              {session.description && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {session.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAllOfSession}
              disabled={!captures || captures.length === 0}
              title="Export all session captures as a ZIP"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export ZIP
            </Button>
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={cn(
                  'px-2 py-1.5',
                  view === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent',
                )}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'px-2 py-1.5',
                  view === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent',
                )}
                title="List view"
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <CaptureFilters
        domains={domains}
        tags={tags}
        filters={filters}
        onChange={setFilters}
      />

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Select value={moveTarget} onValueChange={setMoveTarget}>
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Move to…" />
                </SelectTrigger>
                <SelectContent>
                  {otherSessions.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      No other session
                    </SelectItem>
                  )}
                  {otherSessions.map((s) =>
                    s.id === undefined ? null : (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMove}
                disabled={!moveTarget || moveTarget === '__none__'}
              >
                <ArrowRightLeft className="mr-1 h-4 w-4" />
                Move
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={exportSelected}>
              <Download className="mr-1 h-4 w-4" />
              Export ZIP
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {captures === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filteredCaptures.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            {captures.length === 0
              ? 'No captures in this session. Open the popup to create one.'
              : 'No capture matches the filters.'}
          </div>
        ) : (
          <CaptureGrid
            captures={filteredCaptures}
            view={view}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )}
      </div>
    </div>
  );
}
