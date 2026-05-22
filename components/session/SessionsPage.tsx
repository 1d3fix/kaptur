import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/session';
import { BackupActions } from './BackupActions';
import { SessionCreateDialog } from './SessionCreateDialog';
import { SessionList } from './SessionList';

export function SessionsPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const setActive = useSessionStore((s) => s.setActiveSessionId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Group your captures by investigation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BackupActions />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludeArchived((v) => !v)}
          >
            {includeArchived ? 'Hide archived' : 'Show archived'}
          </Button>
          <SessionCreateDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New session
              </Button>
            }
            onCreated={(id) => void setActive(id)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <SessionList includeArchived={includeArchived} />
      </div>
    </div>
  );
}
