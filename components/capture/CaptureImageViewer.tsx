import { useRef } from 'react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useObjectUrl } from '@/lib/hooks/useObjectUrl';

interface Props {
  blob: Blob;
  alt: string;
}

export function CaptureImageViewer({ blob, alt }: Props) {
  const url = useObjectUrl(blob);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-md border bg-muted/30">
      <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => transformRef.current?.zoomOut()}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => transformRef.current?.zoomIn()}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => transformRef.current?.resetTransform()}
          title="Reset zoom"
          aria-label="Reset zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => transformRef.current?.centerView()}
          title="Fit to window"
          aria-label="Fit to window"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <TransformWrapper
        ref={transformRef}
        minScale={0.1}
        maxScale={10}
        initialScale={1}
        centerOnInit
        wheel={{ step: 0.15 }}
        doubleClick={{ disabled: false, mode: 'toggle' }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          {url ? (
            <img
              src={url}
              alt={alt}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Loading image…
            </div>
          )}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
