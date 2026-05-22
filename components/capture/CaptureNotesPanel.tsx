import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { updateCapture } from '@/lib/db/mutations';

const AUTOSAVE_DELAY_MS = 600;

interface Props {
  captureId: number;
  initialNotes: string | undefined;
}

export function CaptureNotesPanel({ captureId, initialNotes }: Props) {
  const [value, setValue] = useState(initialNotes ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSavedRef = useRef(initialNotes ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialNotes ?? '');
    lastSavedRef.current = initialNotes ?? '';
  }, [captureId, initialNotes]);

  useEffect(() => {
    if (value === lastSavedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('saving');
    timerRef.current = setTimeout(async () => {
      await updateCapture(captureId, { notes: value });
      lastSavedRef.current = value;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1200);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [captureId, value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Lightweight markdown — autosave enabled
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {status === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </>
          )}
          {status === 'saved' && (
            <>
              <Check className="h-3 w-3 text-green-600" /> Saved
            </>
          )}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Free-form notes about this capture…"
        className="min-h-[260px] resize-y font-mono text-xs"
      />
    </div>
  );
}
