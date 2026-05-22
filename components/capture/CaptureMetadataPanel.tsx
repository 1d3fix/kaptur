import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { TagInput } from '@/components/tag/TagInput';
import { getSessionById } from '@/lib/db/queries';
import { setCaptureTags } from '@/lib/db/tags';
import type { Capture } from '@/lib/db/schema';
import { CopyableHash } from './CopyableHash';

const TYPE_LABEL: Record<Capture['captureType'], string> = {
  visible: 'Visible',
  region: 'Region',
};

interface Props {
  capture: Capture;
}

export function CaptureMetadataPanel({ capture }: Props) {
  const session = useLiveQuery(
    () => getSessionById(capture.sessionId),
    [capture.sessionId],
  );

  return (
    <div className="flex flex-col gap-5 text-sm">
      <Field label="URL">
        <a
          href={capture.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-primary hover:underline"
        >
          <span className="break-all">{capture.url}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Domain">
          <span className="font-mono text-xs">{capture.domain || '—'}</span>
        </Field>
        <Field label="Type">{TYPE_LABEL[capture.captureType]}</Field>
        <Field label="Captured at">
          {format(capture.capturedAt, "MMM d, yyyy 'at' HH:mm:ss")}
        </Field>
        <Field label="Image dimensions">
          <span className="font-mono text-xs">
            {capture.width} × {capture.height}
          </span>
        </Field>
        <Field label="Viewport">
          <span className="font-mono text-xs">
            {capture.viewportWidth || '—'} × {capture.viewportHeight || '—'}
          </span>
        </Field>
        <Field label="DPR">
          <span className="font-mono text-xs">
            {capture.devicePixelRatio || '—'}
          </span>
        </Field>
      </div>

      {session && (
        <Field label="Session">
          <Link
            to="/sessions/$slug"
            params={{ slug: session.slug }}
            className="inline-flex items-center gap-2 rounded border px-2 py-1 hover:bg-accent"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: session.color ?? 'transparent' }}
            />
            <span className="text-xs">{session.name}</span>
          </Link>
        </Field>
      )}

      <Field label="Tags">
        {capture.id !== undefined && (
          <TagInput
            tags={capture.tags}
            onChange={(next) => {
              if (capture.id === undefined) return;
              void setCaptureTags(capture.id, next).catch((err) =>
                toast.error(err instanceof Error ? err.message : String(err)),
              );
            }}
          />
        )}
      </Field>

      <div className="grid gap-2 rounded-md border bg-card p-3">
        <h3 className="text-sm font-semibold">Hashes</h3>
        <CopyableHash label="Raw" hash={capture.rawHash} />
        <CopyableHash label="Final" hash={capture.finalHash} />
        {capture.htmlHash && (
          <CopyableHash label="HTML" hash={capture.htmlHash} />
        )}
      </div>

      <Field label="User-Agent">
        <p className="break-all text-xs text-muted-foreground">
          {capture.userAgent || '—'}
        </p>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
