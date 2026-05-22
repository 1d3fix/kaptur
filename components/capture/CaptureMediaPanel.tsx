import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Download,
  ExternalLink,
  FileAudio,
  FileImage,
  FileVideo,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { updateMediaItem } from '@/lib/db/mutations';
import { getMediaForCapture, getSessionById } from '@/lib/db/queries';
import type { Capture, CapturedMedia, MediaFetchStatus } from '@/lib/db/schema';
import { sanitizeFsSegment } from '@/lib/export/naming';
import { exportMediaToZip } from '@/lib/export/zip';
import { useObjectUrl } from '@/lib/hooks/useObjectUrl';
import { processMediaItem } from '@/lib/media/processor';

interface Props {
  capture: Capture;
}

export function CaptureMediaPanel({ capture }: Props) {
  const items = useLiveQuery(
    () => (capture.id !== undefined ? getMediaForCapture(capture.id) : []),
    [capture.id],
  );

  const session = useLiveQuery(
    () => getSessionById(capture.sessionId),
    [capture.sessionId],
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [collapseGen, setCollapseGen] = useState(0);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());

  if (!capture.mediaCollectedAt) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Collecting media…
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No media found on this page.
      </p>
    );
  }

  const allIds = items
    .map((i) => i.id)
    .filter((id): id is number => id !== undefined);
  const isAllSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));
  const selectedCount = allIds.filter((id) => selected.has(id)).length;

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(isAllSelected ? new Set() : new Set(allIds));
  }

  function handleExpandAll() {
    setExpandAll(true);
  }

  function handleCollapseAll() {
    setExpandAll(false);
    setCollapseGen((g) => g + 1);
  }

  async function handleDownloadSelected() {
    const targets = (items ?? []).filter(
      (i) => i.id !== undefined && selected.has(i.id),
    );
    if (targets.length === 0) return;

    setDownloadingIds(
      new Set(
        targets.map((i) => i.id).filter((id): id is number => id !== undefined),
      ),
    );

    const mediaEntries: Array<{ blob: Blob; filename: string }> = [];
    let skippedCount = 0;

    await Promise.all(
      targets.map(async (item) => {
        if (!item.id) return;
        try {
          let blob: Blob | undefined;

          if (item.fetchStatus === 'ok' && item.blob) {
            blob = item.blob;
          } else if (item.type !== 'video' && !item.url.startsWith('blob:')) {
            const result = await processMediaItem({
              url: item.url,
              type: item.type,
              mimeType: item.mimeType,
              alt: item.alt,
              naturalWidth: item.naturalWidth,
              naturalHeight: item.naturalHeight,
            });
            await updateMediaItem(item.id, result);
            blob = result.blob;
          }

          if (blob) {
            mediaEntries.push({ blob, filename: filenameFromUrl(item.url) });
          } else {
            skippedCount++;
          }
        } catch {
          skippedCount++;
        } finally {
          setDownloadingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id!);
            return next;
          });
        }
      }),
    );

    if (mediaEntries.length > 0) {
      const zipBase = `${sanitizeFsSegment(session?.name ?? 'media')}_${sanitizeFsSegment(capture.customName)}`;
      try {
        const summary = await exportMediaToZip({
          items: mediaEntries,
          zipBaseName: zipBase,
        });
        toast.success(
          `ZIP : ${summary.zipFileName} (${summary.fileCount} fichier${summary.fileCount > 1 ? 's' : ''})`,
        );
      } catch (err) {
        toast.error(
          `Erreur ZIP : ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      toast.error('Aucun fichier récupérable dans la sélection.');
    }

    if (skippedCount > 0) {
      toast.info(
        `${skippedCount} élément${skippedCount > 1 ? 's' : ''} ignoré${skippedCount > 1 ? 's' : ''} (vidéo, CORS ou indisponible)`,
      );
    }
  }

  const images = items.filter((i) => i.type === 'image').length;
  const videos = items.filter((i) => i.type === 'video').length;
  const audios = items.filter((i) => i.type === 'audio').length;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleSelectAll}
          className="rounded border px-2 py-1 text-xs hover:bg-accent"
        >
          {isAllSelected ? 'Deselect all' : 'Select all'}
        </button>

        <button
          type="button"
          onClick={expandAll ? handleCollapseAll : handleExpandAll}
          className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"
        >
          {expandAll ? (
            <>
              <ChevronsDownUp className="h-3 w-3" />
              Collapse all
            </>
          ) : (
            <>
              <ChevronsUpDown className="h-3 w-3" />
              Expand all
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDownloadSelected}
          disabled={selectedCount === 0}
          className={cn(
            'flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors',
            selectedCount > 0
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-not-allowed opacity-40',
          )}
        >
          <Download className="h-3 w-3" />
          Download{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>

        <span className="ml-auto text-xs text-muted-foreground">
          {[
            images > 0 && `${images} image${images > 1 ? 's' : ''}`,
            videos > 0 && `${videos} video${videos > 1 ? 's' : ''}`,
            audios > 0 && `${audios} audio${audios > 1 ? 's' : ''}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <MediaRow
            key={item.id}
            item={item}
            checked={item.id !== undefined && selected.has(item.id)}
            onToggle={() => item.id !== undefined && toggleSelect(item.id)}
            expandAll={expandAll}
            collapseGen={collapseGen}
            downloading={item.id !== undefined && downloadingIds.has(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface MediaRowProps {
  item: CapturedMedia;
  checked: boolean;
  onToggle: () => void;
  expandAll: boolean;
  collapseGen: number;
  downloading: boolean;
}

function MediaRow({
  item,
  checked,
  onToggle,
  expandAll,
  collapseGen,
  downloading,
}: MediaRowProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  // Sync local state when parent collapses all
  useEffect(() => {
    setLocalOpen(false);
  }, [collapseGen]);

  const isOpen = expandAll || localOpen;
  const exifFields = item.exif ? parseExif(item.exif) : null;
  const hasDetails = item.sha256 || (exifFields && exifFields.length > 0);

  // Preview: object URL from blob when available (independent of selection)
  const previewUrl = useObjectUrl(
    item.type === 'image' ? item.blob : undefined,
  );

  async function handleCopyHash() {
    if (!item.sha256) return;
    try {
      await navigator.clipboard.writeText(item.sha256);
      setHashCopied(true);
      toast.success('Hash copied');
      setTimeout(() => setHashCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  }

  async function handleOpenUrl() {
    try {
      await browser.downloads.download({
        url: item.url,
        filename: filenameFromUrl(item.url),
      });
      toast.success('Download started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <div
      className={cn(
        'rounded-md border bg-card text-sm transition-colors',
        checked && 'border-primary/50 bg-primary/5',
      )}
    >
      {/* Main row */}
      <div className="flex min-w-0 items-center gap-2 p-2">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/40 hover:border-primary',
          )}
          aria-label={checked ? 'Deselect' : 'Select'}
        >
          {checked && <Check className="h-2.5 w-2.5" />}
        </button>

        <TypeIcon type={item.type} />

        {/* URL */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-mono text-xs text-primary hover:underline"
          title={item.url}
        >
          {item.url}
        </a>

        <StatusBadge status={item.fetchStatus} loading={downloading} />

        {item.size !== undefined && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatBytes(item.size)}
          </span>
        )}

        {/* Expand toggle */}
        {hasDetails && (
          <button
            type="button"
            onClick={() => setLocalOpen((v) => !v)}
            className="shrink-0 rounded p-1 hover:bg-accent"
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Open/download via browser */}
        {(item.type === 'video' ||
          item.fetchStatus === 'cors_error' ||
          item.fetchStatus === 'fetch_error' ||
          item.fetchStatus === 'too_large') && (
          <button
            type="button"
            onClick={handleOpenUrl}
            title="Download via browser"
            className="shrink-0 rounded p-1 hover:bg-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Error */}
      {item.fetchError && (
        <p className="border-t px-3 py-1.5 text-xs text-destructive">
          {item.fetchError}
        </p>
      )}

      {/* Preview — always shown for images; blob URL if downloaded, direct URL otherwise */}
      {item.type === 'image' && (
        <div className="border-t p-2">
          <img
            src={previewUrl ?? item.url}
            alt={item.alt ?? ''}
            className="max-h-48 w-auto rounded object-contain"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          {item.alt && (
            <p className="mt-1 text-xs text-muted-foreground">{item.alt}</p>
          )}
        </div>
      )}

      {/* Expanded details */}
      {isOpen && hasDetails && (
        <div className="space-y-2 border-t px-3 py-2">
          {item.sha256 && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">
                SHA-256
              </span>
              <button
                type="button"
                onClick={handleCopyHash}
                className="group flex min-w-0 items-center gap-1.5 rounded border px-2 py-1 text-left transition-colors hover:bg-accent"
                title={item.sha256}
              >
                <span className="truncate font-mono text-xs">
                  {item.sha256.slice(0, 16)}…
                </span>
                {hashCopied ? (
                  <Check className="h-3 w-3 shrink-0 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                )}
              </button>
            </div>
          )}

          {exifFields && exifFields.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                EXIF ({exifFields.length} fields)
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                {exifFields.map(([key, val]) => (
                  <ExifRow key={key} label={key} value={val} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExifRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs" title={value}>
        {value}
      </span>
    </>
  );
}

function TypeIcon({ type }: { type: CapturedMedia['type'] }) {
  const cls = 'h-4 w-4 shrink-0 text-muted-foreground';
  if (type === 'video') return <FileVideo className={cls} />;
  if (type === 'audio') return <FileAudio className={cls} />;
  return <FileImage className={cls} />;
}

function StatusBadge({
  status,
  loading,
}: {
  status: MediaFetchStatus;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        fetching
      </span>
    );
  }

  const base =
    'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider';
  const styles: Record<MediaFetchStatus, string> = {
    pending: cn(base, 'bg-muted text-muted-foreground'),
    ok: cn(base, 'bg-green-500/10 text-green-700 dark:text-green-400'),
    cors_error: cn(
      base,
      'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    ),
    fetch_error: cn(base, 'bg-destructive/10 text-destructive'),
    skipped: cn(base, 'bg-muted text-muted-foreground'),
    too_large: cn(
      base,
      'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    ),
  };
  const labels: Record<MediaFetchStatus, string> = {
    pending: 'pending',
    ok: 'ok',
    cors_error: 'CORS',
    fetch_error: 'error',
    skipped: 'skipped',
    too_large: 'too large',
  };
  return <span className={styles[status]}>{labels[status]}</span>;
}

function parseExif(json: string): [string, string][] {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => [k, String(v)] as [string, string])
      .slice(0, 60);
  } catch {
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const raw = path.split('/').pop() ?? '';
    return sanitizeFsSegment(raw) || 'media';
  } catch {
    return 'media';
  }
}
