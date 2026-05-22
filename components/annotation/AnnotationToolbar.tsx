import {
  ArrowUpRight,
  Highlighter,
  MousePointer2,
  Redo2,
  Square,
  SquareDashedBottomCode,
  Type,
  Undo2,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PALETTE,
  STROKE_LEVELS,
  type StrokeLevel,
  type Tool,
} from '@/lib/annotation/types';
import { useAnnotationStore } from '@/stores/annotation';

const TOOLS: {
  id: Tool;
  label: string;
  shortcut: string;
  Icon: typeof Square;
}[] = [
  { id: 'select', label: 'Select (V)', shortcut: 'V', Icon: MousePointer2 },
  { id: 'rect', label: 'Rectangle (R)', shortcut: 'R', Icon: Square },
  { id: 'arrow', label: 'Arrow (A)', shortcut: 'A', Icon: ArrowUpRight },
  { id: 'text', label: 'Text (T)', shortcut: 'T', Icon: Type },
  {
    id: 'highlight',
    label: 'Highlight (H)',
    shortcut: 'H',
    Icon: Highlighter,
  },
  { id: 'blur', label: 'Blur (B)', shortcut: 'B', Icon: Wand2 },
  {
    id: 'number',
    label: 'Numbering (N)',
    shortcut: 'N',
    Icon: SquareDashedBottomCode,
  },
];

export function AnnotationToolbar() {
  const tool = useAnnotationStore((s) => s.tool);
  const setTool = useAnnotationStore((s) => s.setTool);
  const color = useAnnotationStore((s) => s.color);
  const setColor = useAnnotationStore((s) => s.setColor);
  const strokeWidth = useAnnotationStore((s) => s.strokeWidth);
  const setStrokeWidth = useAnnotationStore((s) => s.setStrokeWidth);
  const undo = useAnnotationStore((s) => s.undo);
  const redo = useAnnotationStore((s) => s.redo);
  const past = useAnnotationStore((s) => s.past);
  const future = useAnnotationStore((s) => s.future);

  return (
    <aside className="flex w-14 flex-col items-center gap-1 border-r bg-card p-2">
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTool(id)}
          title={label}
          aria-label={label}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
            tool === id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent',
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}

      <div className="my-1 h-px w-full bg-border" />

      <div className="grid grid-cols-2 gap-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            title={c}
            aria-label={`Color ${c}`}
            className={cn(
              'h-4 w-4 rounded-full border transition-transform',
              color === c
                ? 'scale-110 border-foreground'
                : 'border-input hover:scale-105',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="my-1 h-px w-full bg-border" />

      <div className="flex flex-col gap-1">
        {STROKE_LEVELS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setStrokeWidth(w as StrokeLevel)}
            title={`Stroke ${w}`}
            aria-label={`Stroke ${w}`}
            className={cn(
              'flex h-6 w-10 items-center justify-center rounded transition-colors',
              strokeWidth === w
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            )}
          >
            <span
              className="rounded-full bg-current"
              style={{ height: w, width: w + 12 }}
            />
          </button>
        ))}
      </div>

      <div className="my-1 h-px w-full bg-border" />

      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9"
        onClick={undo}
        disabled={past.length === 0}
        title="Undo (Cmd/Ctrl+Z)"
        aria-label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9"
        onClick={redo}
        disabled={future.length === 0}
        title="Redo (Cmd/Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </aside>
  );
}
