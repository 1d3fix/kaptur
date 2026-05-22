import { format } from 'date-fns';
import { Archive, ArchiveRestore, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getAllSessions } from '@/lib/db/queries';
import {
  archiveSession,
  deleteSession,
  unarchiveSession,
} from '@/lib/db/mutations';
import { useSessionStore } from '@/stores/session';

interface Props {
  includeArchived: boolean;
}

export function SessionList({ includeArchived }: Props) {
  const sessions = useLiveQuery(
    () => getAllSessions({ includeArchived }),
    [includeArchived],
  );
  const activeId = useSessionStore((s) => s.activeSessionId);
  const setActive = useSessionStore((s) => s.setActiveSessionId);

  if (sessions === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No sessions yet. Create one to get started.
        </p>
      </div>
    );
  }

  async function handleSetActive(id: number, name: string) {
    await setActive(id);
    toast.success(`Active session: ${name}`);
  }

  async function handleArchive(id: number, archived: boolean) {
    if (archived) await unarchiveSession(id);
    else await archiveSession(id);
    toast.success(archived ? 'Session restored' : 'Session archived');
  }

  async function handleDelete(id: number, name: string, captureCount: number) {
    const ok = window.confirm(
      captureCount > 0
        ? `Delete "${name}" and its ${captureCount} capture(s)? This action is irreversible.`
        : `Delete session "${name}"?`,
    );
    if (!ok) return;
    if (activeId === id) await setActive(null);
    await deleteSession(id);
    toast.success('Session deleted');
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Name</TableHead>
          <TableHead>Captures</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          const archived = !!s.archivedAt;
          return (
            <TableRow key={s.id} className={cn(archived && 'opacity-60')}>
              <TableCell>
                <Link
                  to="/sessions/$slug"
                  params={{ slug: s.slug }}
                  className="flex items-center gap-3 hover:underline-offset-2"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color ?? 'transparent' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium hover:underline">
                        {s.name}
                      </span>
                      {isActive && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                          active
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {s.captureCount}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(s.createdAt, 'MMM d, yyyy, HH:mm')}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {!archived && !isActive && s.id !== undefined && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetActive(s.id!, s.name)}
                      title="Set as active session"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Activate
                    </Button>
                  )}
                  {s.id !== undefined && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleArchive(s.id!, archived)}
                      title={archived ? 'Restore' : 'Archive'}
                    >
                      {archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {s.id !== undefined && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        handleDelete(s.id!, s.name, s.captureCount)
                      }
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
