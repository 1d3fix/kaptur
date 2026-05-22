import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  hash: string;
  match?: boolean | null;
}

export function CopyableHash({ label, hash, match }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="group flex min-w-0 items-center gap-1.5 rounded border px-2 py-1 text-left transition-colors hover:bg-accent"
        title={hash}
      >
        <span className="truncate font-mono text-xs">{hash.slice(0, 16)}…</span>
        {copied ? (
          <Check className="h-3 w-3 shrink-0 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
        )}
      </button>
      {match === true && (
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
            'bg-green-500/10 text-green-700 dark:text-green-400',
          )}
        >
          ✓ intact
        </span>
      )}
      {match === false && (
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
          ✗ altered
        </span>
      )}
    </div>
  );
}
