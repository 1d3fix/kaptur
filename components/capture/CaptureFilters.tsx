import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface CaptureFiltersState {
  fromDate?: string;
  toDate?: string;
  domains: string[];
  tags: string[];
}

interface Props {
  domains: string[];
  tags: string[];
  filters: CaptureFiltersState;
  onChange: (next: CaptureFiltersState) => void;
}

export function CaptureFilters({ domains, tags, filters, onChange }: Props) {
  const activeCount =
    (filters.fromDate ? 1 : 0) +
    (filters.toDate ? 1 : 0) +
    (filters.domains.length > 0 ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0);

  function toggleDomain(domain: string) {
    const next = filters.domains.includes(domain)
      ? filters.domains.filter((d) => d !== domain)
      : [...filters.domains, domain];
    onChange({ ...filters, domains: next });
  }

  function toggleTag(tag: string) {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags: next });
  }

  function reset() {
    onChange({
      fromDate: undefined,
      toDate: undefined,
      domains: [],
      tags: [],
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="filter-from" className="text-xs">
            From
          </Label>
          <Input
            id="filter-from"
            type="date"
            value={filters.fromDate ?? ''}
            onChange={(e) =>
              onChange({ ...filters, fromDate: e.target.value || undefined })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filter-to" className="text-xs">
            To
          </Label>
          <Input
            id="filter-to"
            type="date"
            value={filters.toDate ?? ''}
            onChange={(e) =>
              onChange({ ...filters, toDate: e.target.value || undefined })
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Domains</Label>
        <div className="flex flex-wrap gap-1.5">
          {domains.length === 0 && (
            <span className="text-xs text-muted-foreground">No domain.</span>
          )}
          {domains.map((d) => {
            const selected = filters.domains.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDomain(d)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:bg-accent',
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 && (
            <span className="text-xs text-muted-foreground">No tag.</span>
          )}
          {tags.map((t) => {
            const selected = filters.tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:bg-accent',
                )}
              >
                #{t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
