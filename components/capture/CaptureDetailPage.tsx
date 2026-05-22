import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Download, PenLine, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnnotationEditor } from '@/components/annotation/AnnotationEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteCapture, updateCapture } from '@/lib/db/mutations';
import { getCaptureById, getSessionById } from '@/lib/db/queries';
import { downloadCaptureAsPng } from '@/lib/export/zip';
import { captureDetailRoute } from '@/entrypoints/app/routes';
import { CaptureHtmlPanel } from './CaptureHtmlPanel';
import { CaptureImageViewer } from './CaptureImageViewer';
import { CaptureMediaPanel } from './CaptureMediaPanel';
import { CaptureMetadataPanel } from './CaptureMetadataPanel';
import { CaptureNotesPanel } from './CaptureNotesPanel';

export function CaptureDetailPage() {
  const { id } = captureDetailRoute.useParams();
  const captureId = Number(id);
  const navigate = useNavigate();

  const capture = useLiveQuery(
    () => (Number.isFinite(captureId) ? getCaptureById(captureId) : undefined),
    [captureId],
  );

  const [nameDraft, setNameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [annotating, setAnnotating] = useState(false);

  useEffect(() => {
    if (capture) setNameDraft(capture.customName);
  }, [capture]);

  async function handleRenameSave() {
    if (!capture || capture.id === undefined) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === capture.customName) {
      setRenaming(false);
      setNameDraft(capture.customName);
      return;
    }
    await updateCapture(capture.id, { customName: trimmed });
    setRenaming(false);
    toast.success('Name updated.');
  }

  async function handleDelete() {
    if (!capture || capture.id === undefined) return;
    const ok = window.confirm(
      `Delete "${capture.customName}"? This action is irreversible.`,
    );
    if (!ok) return;
    await deleteCapture(capture.id);
    toast.success('Capture deleted.');
    void navigate({ to: '/sessions' });
  }

  async function handleDownloadPng() {
    if (!capture) return;
    try {
      const session = await getSessionById(capture.sessionId);
      const summary = await downloadCaptureAsPng(capture, session ?? undefined);
      toast.success(`PNG downloaded: ${summary.fileName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (!Number.isFinite(captureId)) {
    return <NotFound />;
  }

  if (capture === undefined) {
    return <p className="text-sm text-muted-foreground">Loading capture…</p>;
  }

  if (capture === null || !capture) {
    return <NotFound />;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link to="/sessions">
            <ArrowLeft className="mr-1 h-4 w-4" />
            All sessions
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {renaming ? (
              <Input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={handleRenameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleRenameSave();
                  } else if (e.key === 'Escape') {
                    setRenaming(false);
                    setNameDraft(capture.customName);
                  }
                }}
                className="h-9 max-w-2xl text-lg font-semibold"
              />
            ) : (
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="group flex min-w-0 items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-accent"
                title="Click to rename"
              >
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {capture.customName}
                </h1>
                <PenLine className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPng}
              title="Download the PNG image (with banner + annotations)"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAnnotating(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Annotate
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <CaptureImageViewer blob={capture.imageBlob} alt={capture.customName} />

        <Tabs
          defaultValue="metadata"
          className="flex min-h-0 flex-col overflow-hidden"
        >
          <TabsList className="self-start">
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
          </TabsList>

          <TabsContent
            value="metadata"
            className="flex-1 overflow-auto rounded-md border p-4"
          >
            <CaptureMetadataPanel capture={capture} />
          </TabsContent>

          <TabsContent
            value="html"
            className="flex-1 overflow-hidden rounded-md border p-4 data-[state=inactive]:hidden"
          >
            <CaptureHtmlPanel
              htmlContent={capture.htmlContent}
              htmlSize={capture.htmlSize}
              filename={capture.customName}
            />
          </TabsContent>

          <TabsContent
            value="notes"
            className="flex-1 overflow-auto rounded-md border p-4"
          >
            {capture.id !== undefined && (
              <CaptureNotesPanel
                captureId={capture.id}
                initialNotes={capture.notes}
              />
            )}
          </TabsContent>

          <TabsContent
            value="media"
            className="flex-1 overflow-auto rounded-md border p-4"
          >
            <CaptureMediaPanel capture={capture} />
          </TabsContent>
        </Tabs>
      </div>

      {annotating && (
        <AnnotationEditor
          capture={capture}
          onClose={() => setAnnotating(false)}
        />
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to="/sessions">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Toutes les sessions
        </Link>
      </Button>
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        Capture not found.
      </div>
    </div>
  );
}
