import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useObjectUrl } from '@/lib/hooks/useObjectUrl';
import type { Capture } from '@/lib/db/schema';

interface Props {
  capture: Capture;
  selected: boolean;
  onToggleSelect: (id: number) => void;
}

export function CaptureCard({ capture, selected, onToggleSelect }: Props) {
  const id = capture.id;
  const thumbUrl = useObjectUrl(capture.thumbnailBlob);

  if (id === undefined) return null;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors',
        selected
          ? 'border-primary ring-2 ring-primary'
          : 'hover:border-foreground/30',
      )}
    >
      <Link
        to="/captures/$id"
        params={{ id: String(id) }}
        className="flex flex-col"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt={capture.customName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
          <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">
            {capture.captureType === 'region' ? 'region' : 'visible'}
          </span>
        </div>
        <div className="flex flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {capture.customName}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {capture.domain || '—'}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {format(capture.capturedAt, 'MMM d, yyyy, HH:mm')}
          </p>
        </div>
      </Link>
      <div
        className="absolute left-2 top-2 rounded bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100 data-[selected=true]:opacity-100"
        data-selected={selected}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(id)}
          aria-label="Select capture"
        />
      </div>
    </article>
  );
}
