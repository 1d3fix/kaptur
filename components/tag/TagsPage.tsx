import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteTag, getAllTags, renameTag } from '@/lib/db/tags';
import type { Tag } from '@/lib/db/schema';

export function TagsPage() {
  const tags = useLiveQuery(() => getAllTags());

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground">
          Rename or delete a tag. Renaming to an existing tag merges them
          automatically.
        </p>
      </header>

      {tags === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tags.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          No tag yet. Add some from a capture detail page.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Name</TableHead>
                <TableHead>Captures</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((t) => (
                <TagRow key={t.id} tag={t} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function TagRow({ tag }: { tag: Tag }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tag.name);

  async function handleRename() {
    if (tag.id === undefined) return;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === tag.name) {
      setEditing(false);
      setDraft(tag.name);
      return;
    }
    try {
      await renameTag(tag.id, trimmed);
      toast.success(
        `"${tag.name}" → "${trimmed.toLowerCase().replace(/\s+/g, '-')}"`,
      );
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete() {
    if (tag.id === undefined) return;
    const ok = window.confirm(
      `Delete tag "${tag.name}" from ${tag.usageCount} capture${tag.usageCount > 1 ? 's' : ''}?`,
    );
    if (!ok) return;
    try {
      await deleteTag(tag.id);
      toast.success(`Tag "${tag.name}" deleted.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <TableRow>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleRename();
                } else if (e.key === 'Escape') {
                  setEditing(false);
                  setDraft(tag.name);
                }
              }}
              className="h-8 font-mono text-xs"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleRename}
              aria-label="Confirm"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setEditing(false);
                setDraft(tag.name);
              }}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary">
            #{tag.name}
          </span>
        )}
      </TableCell>
      <TableCell className="font-mono text-sm">{tag.usageCount}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {!editing && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditing(true);
                setDraft(tag.name);
              }}
              title="Rename"
              aria-label="Rename"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
