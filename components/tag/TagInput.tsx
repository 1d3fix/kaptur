import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllTags, normalizeTagName } from '@/lib/db/tags';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add a tag…',
}: Props) {
  const allTags = useLiveQuery(() => getAllTags());
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!allTags) return [];
    const lc = input.trim().toLowerCase();
    const filtered = allTags
      .filter((t) => !tags.includes(t.name))
      .filter((t) => (lc ? t.name.toLowerCase().includes(lc) : true))
      .slice(0, 8);
    return filtered;
  }, [allTags, input, tags]);

  function addTag(name: string) {
    const normalized = normalizeTagName(name);
    if (!normalized || tags.includes(normalized)) {
      setInput('');
      return;
    }
    onChange([...tags, normalized]);
    setInput('');
    setHighlight(0);
  }

  function removeTag(name: string) {
    onChange(tags.filter((t) => t !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const trimmed = input.trim();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && highlight < suggestions.length) {
        const hit = suggestions[highlight];
        if (hit) addTag(hit.name);
      } else if (trimmed) {
        addTag(trimmed);
      }
    } else if (e.key === ',' || (e.key === ' ' && trimmed)) {
      e.preventDefault();
      if (trimmed) addTag(trimmed);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-background p-1.5 text-sm focus-within:ring-2 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
          >
            #{t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="rounded-sm hover:bg-primary/20"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent text-xs outline-none"
        />
      </div>

      {open && (suggestions.length > 0 || input.trim().length > 0) && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md">
          {suggestions.map((t, idx) => (
            <li
              key={t.id}
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(t.name);
              }}
              onMouseEnter={() => setHighlight(idx)}
              className={cn(
                'flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs',
                idx === highlight ? 'bg-accent' : 'hover:bg-accent/60',
              )}
            >
              <span>#{t.name}</span>
              <span className="font-mono text-muted-foreground">
                {t.usageCount}
              </span>
            </li>
          ))}
          {input.trim().length > 0 &&
            !suggestions.some((s) => s.name === normalizeTagName(input)) &&
            !tags.includes(normalizeTagName(input)) && (
              <li
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(input.trim());
                }}
                className="cursor-pointer border-t px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/60"
              >
                Create{' '}
                <span className="font-mono text-foreground">
                  #{normalizeTagName(input)}
                </span>
              </li>
            )}
        </ul>
      )}
    </div>
  );
}
