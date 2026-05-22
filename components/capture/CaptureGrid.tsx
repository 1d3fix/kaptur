import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Capture } from '@/lib/db/schema';
import { CaptureCard } from './CaptureCard';
import { CaptureListRow } from './CaptureListRow';

const CARD_MIN_WIDTH = 240;
const CARD_GAP = 16;
const ROW_HEIGHT = 260;
const LIST_ROW_HEIGHT = 68;

interface Props {
  captures: Capture[];
  view: 'grid' | 'list';
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}

export function CaptureGrid({
  captures,
  view,
  selectedIds,
  onToggleSelect,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (view === 'list') {
    return (
      <ListVirtualized
        parentRef={parentRef}
        captures={captures}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  return (
    <GridVirtualized
      parentRef={parentRef}
      containerWidth={containerWidth}
      captures={captures}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
    />
  );
}

interface GridVirtualizedProps {
  parentRef: React.RefObject<HTMLDivElement>;
  containerWidth: number;
  captures: Capture[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}

function GridVirtualized({
  parentRef,
  containerWidth,
  captures,
  selectedIds,
  onToggleSelect,
}: GridVirtualizedProps) {
  const columns = useMemo(() => {
    if (containerWidth <= 0) return 1;
    return Math.max(
      1,
      Math.floor((containerWidth + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP)),
    );
  }, [containerWidth]);

  const rowCount = Math.ceil(captures.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT + CARD_GAP,
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      className="relative h-full overflow-auto"
      style={{ contain: 'layout paint' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowItems = captures.slice(start, start + columns);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                height: `${ROW_HEIGHT + CARD_GAP}px`,
                paddingBottom: `${CARD_GAP}px`,
              }}
            >
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: `${CARD_GAP}px`,
                }}
              >
                {rowItems.map((capture) =>
                  capture.id === undefined ? null : (
                    <CaptureCard
                      key={capture.id}
                      capture={capture}
                      selected={selectedIds.has(capture.id)}
                      onToggleSelect={onToggleSelect}
                    />
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ListVirtualizedProps {
  parentRef: React.RefObject<HTMLDivElement>;
  captures: Capture[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}

function ListVirtualized({
  parentRef,
  captures,
  selectedIds,
  onToggleSelect,
}: ListVirtualizedProps) {
  const rowVirtualizer = useVirtualizer({
    count: captures.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LIST_ROW_HEIGHT,
    overscan: 6,
  });

  return (
    <div
      ref={parentRef}
      className="relative h-full overflow-auto rounded-md border"
      style={{ contain: 'layout paint' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const capture = captures[virtualRow.index];
          if (!capture || capture.id === undefined) return null;
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CaptureListRow
                capture={capture}
                selected={selectedIds.has(capture.id)}
                onToggleSelect={onToggleSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
