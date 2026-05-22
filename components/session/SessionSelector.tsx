import { useLiveQuery } from 'dexie-react-hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllSessions } from '@/lib/db/queries';
import { useSessionStore } from '@/stores/session';

const NONE_VALUE = '__none__';

export function SessionSelector() {
  const sessions = useLiveQuery(() =>
    getAllSessions({ includeArchived: false }),
  );
  const activeId = useSessionStore((s) => s.activeSessionId);
  const setActive = useSessionStore((s) => s.setActiveSessionId);

  const value = activeId !== null ? String(activeId) : NONE_VALUE;

  async function handleChange(next: string) {
    if (next === NONE_VALUE) await setActive(null);
    else await setActive(Number(next));
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder="Aucune session active" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>
          <span className="text-muted-foreground">Aucune</span>
        </SelectItem>
        {sessions?.map((s) =>
          s.id === undefined ? null : (
            <SelectItem key={s.id} value={String(s.id)}>
              <span className="flex items-center gap-2">
                {s.color && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                )}
                <span className="truncate">{s.name}</span>
              </span>
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}
