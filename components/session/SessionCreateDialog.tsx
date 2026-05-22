import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createSession } from '@/lib/db/mutations';
import { SESSION_COLORS } from './colors';

interface Props {
  trigger: React.ReactNode;
  onCreated?: (id: number) => void;
}

export function SessionCreateDialog({ trigger, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | undefined>(SESSION_COLORS[5]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setDescription('');
    setColor(SESSION_COLORS[5]);
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const id = await createSession({
        name: trimmed,
        description: description.trim() || undefined,
        color,
      });
      toast.success(`Session "${trimmed}" created`);
      onCreated?.(id);
      reset();
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Could not create session');
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>New session</DialogTitle>
            <DialogDescription>
              A logical folder to group captures of one investigation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="session-name">Name</Label>
              <Input
                id="session-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Investigation X — May 2026"
                autoFocus
                maxLength={120}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="session-desc">Description (optional)</Label>
              <Textarea
                id="session-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Context, scope, sources&hellip;"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SESSION_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform',
                      color === c
                        ? 'scale-110 border-foreground'
                        : 'border-transparent hover:scale-105',
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
