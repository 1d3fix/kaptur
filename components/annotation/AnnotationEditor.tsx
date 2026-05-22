import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Konva from 'konva';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { addBanner } from '@/lib/image/banner';
import { sha256 } from '@/lib/image/hash';
import { generateThumbnail } from '@/lib/image/thumbnail';
import type { AnnotationData, TextShape, Tool } from '@/lib/annotation/types';
import type { Capture } from '@/lib/db/schema';
import { db } from '@/lib/db/schema';
import { getBannerLocale, type BannerLocale } from '@/lib/db/settings';
import { useAnnotationStore } from '@/stores/annotation';
import { AnnotationCanvas } from './AnnotationCanvas';
import { AnnotationToolbar } from './AnnotationToolbar';
import { TextEditorOverlay } from './TextEditorOverlay';

const SHORTCUT_TOOLS: Record<string, Tool> = {
  v: 'select',
  r: 'rect',
  a: 'arrow',
  t: 'text',
  h: 'highlight',
  b: 'blur',
  n: 'number',
};

interface Props {
  capture: Capture;
  onClose: () => void;
}

export function AnnotationEditor({ capture, onClose }: Props) {
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [bannerLocale, setBannerLocaleState] = useState<BannerLocale>('en');

  useEffect(() => {
    void getBannerLocale().then(setBannerLocaleState);
  }, []);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const shapes = useAnnotationStore((s) => s.shapes);
  const loadShapes = useAnnotationStore((s) => s.loadShapes);
  const reset = useAnnotationStore((s) => s.reset);
  const setTool = useAnnotationStore((s) => s.setTool);
  const undo = useAnnotationStore((s) => s.undo);
  const redo = useAnnotationStore((s) => s.redo);
  const deleteShape = useAnnotationStore((s) => s.deleteShape);
  const selectedId = useAnnotationStore((s) => s.selectedId);
  const updateShape = useAnnotationStore((s) => s.updateShape);

  // Load bg image (raw + banner) and existing annotations on mount.
  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    (async () => {
      try {
        const banneredBlob = await addBanner(capture.rawImageBlob, {
          timestamp: capture.capturedAt,
          htmlHash: capture.htmlHash,
          locale: bannerLocale,
          dpr: capture.devicePixelRatio,
        });
        if (cancelled) return;
        createdUrl = URL.createObjectURL(banneredBlob);
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          setBgImage(img);
        };
        img.onerror = () => setError("Impossible de charger l'image de fond.");
        img.src = createdUrl;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    if (capture.annotationJson) {
      try {
        const data = JSON.parse(capture.annotationJson) as AnnotationData;
        if (data?.shapes) loadShapes(data.shapes);
      } catch (e) {
        console.warn('[Kaptur] failed to parse annotationJson', e);
      }
    } else {
      reset();
    }

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      reset();
    };
  }, [capture, loadShapes, reset, bannerLocale]);

  // Measure container size for scaling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      if (!el) return;
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bgImage]);

  // Keyboard shortcuts.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        if (e.key === 'Escape') target.blur();
        return;
      }

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        meta &&
        ((e.key.toLowerCase() === 'z' && e.shiftKey) ||
          e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          deleteShape(selectedId);
        }
        return;
      }
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const next = SHORTCUT_TOOLS[e.key.toLowerCase()];
      if (next) {
        e.preventDefault();
        setTool(next);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedId, deleteShape, setTool, onClose]);

  const layout = useMemo(() => {
    if (!bgImage) return null;
    const cw = containerSize.width;
    const ch = containerSize.height;
    if (cw <= 0 || ch <= 0) return null;
    const scale = Math.min(cw / bgImage.width, ch / bgImage.height, 1);
    return {
      scale,
      stageWidth: bgImage.width * scale,
      stageHeight: bgImage.height * scale,
    };
  }, [bgImage, containerSize]);

  const editingShape = useMemo(
    () =>
      editingTextId
        ? (shapes.find((s) => s.id === editingTextId) as TextShape | undefined)
        : undefined,
    [editingTextId, shapes],
  );

  async function handleSave() {
    if (!stageRef.current || !bgImage || !layout) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        stageRef.current!.toBlob({
          mimeType: 'image/png',
          pixelRatio: 1 / layout.scale,
          callback: (b) =>
            b ? resolve(b) : reject(new Error('toBlob failed.')),
        });
      });

      const finalHash = await sha256(blob);
      const thumbnail = await generateThumbnail(blob, 240);
      const annotationJson = JSON.stringify({
        version: 1,
        shapes,
      } satisfies AnnotationData);

      if (capture.id !== undefined) {
        await db.captures.update(capture.id, {
          imageBlob: blob,
          thumbnailBlob: thumbnail,
          finalHash,
          annotationJson,
          width: bgImage.width,
          height: bgImage.height,
        });
      }
      toast.success('Annotation saved.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleTextEditDone() {
    setEditingTextId(null);
    setTool('select');
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Annotation</h2>
          <span className="truncate text-xs text-muted-foreground">
            {capture.customName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={saving}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Close
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !bgImage}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <AnnotationToolbar />
        <div
          ref={containerRef}
          className="relative flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4"
        >
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !bgImage || !layout ? (
            <p className="text-sm text-muted-foreground">Loading image…</p>
          ) : (
            <div
              className="shrink-0 shadow-xl"
              style={{ width: layout.stageWidth, height: layout.stageHeight }}
            >
              <AnnotationCanvas
                bgImage={bgImage}
                imageWidth={bgImage.width}
                imageHeight={bgImage.height}
                stageWidth={layout.stageWidth}
                stageHeight={layout.stageHeight}
                scale={layout.scale}
                stageRef={stageRef}
                onEditText={setEditingTextId}
              />
            </div>
          )}
        </div>
      </div>

      {editingShape && containerRef.current && layout && (
        <TextEditorOverlay
          shape={editingShape}
          container={containerRef.current}
          scale={layout.scale}
          onChange={(text) =>
            editingShape.id && updateShape(editingShape.id, { text })
          }
          onDone={handleTextEditDone}
        />
      )}
    </div>,
    document.body,
  );
}
