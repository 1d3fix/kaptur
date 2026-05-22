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

const TYPE_LABEL: Record<Capture['captureType'], string> = {
  visible: 'visible',
  region: 'region',
};

export function CaptureListRow({ capture, selected, onToggleSelect }: Props) {
  const id = capture.id;
  const thumbUrl = useObjectUrl(capture.thumbnailBlob);

  if (id === undefined) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b px-3 py-2 transition-colors hover:bg-muted/40',
        selected && 'bg-primary/5',
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect(id)}
        aria-label="Select capture"
      />
      <Link
        to="/captures/$id"
        params={{ id: String(id) }}
        className="flex flex-1 items-center gap-3 overflow-hidden"
      >
        <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {capture.customName}
            </span>
            <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {TYPE_LABEL[capture.captureType]}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {capture.url}
          </p>
        </div>
        <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
          <div>{capture.domain || '—'}</div>
          <div className="font-mono">
            {format(capture.capturedAt, 'MMM d, yyyy, HH:mm')}
          </div>
        </div>
      </Link>
    </div>
  );
}
