import { useEffect, useRef, useState } from 'react';
import {
  Arrow,
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva';
import Konva from 'konva';
import {
  BLUR_DEFAULT_RADIUS,
  HIGHLIGHT_FILL,
  type Shape,
} from '@/lib/annotation/types';
import {
  nextNumberIndex,
  nextShapeId,
  useAnnotationStore,
} from '@/stores/annotation';

interface Props {
  bgImage: HTMLImageElement;
  imageWidth: number;
  imageHeight: number;
  stageWidth: number;
  stageHeight: number;
  scale: number;
  stageRef: React.RefObject<Konva.Stage>;
  onEditText: (id: string) => void;
}

const MIN_DRAW_SIZE = 4;

export function AnnotationCanvas({
  bgImage,
  imageWidth,
  imageHeight,
  stageWidth,
  stageHeight,
  scale,
  stageRef,
  onEditText,
}: Props) {
  const tool = useAnnotationStore((s) => s.tool);
  const color = useAnnotationStore((s) => s.color);
  const strokeWidth = useAnnotationStore((s) => s.strokeWidth);
  const shapes = useAnnotationStore((s) => s.shapes);
  const selectedId = useAnnotationStore((s) => s.selectedId);
  const selectShape = useAnnotationStore((s) => s.selectShape);
  const addShape = useAnnotationStore((s) => s.addShape);
  const updateShape = useAnnotationStore((s) => s.updateShape);
  const commitChange = useAnnotationStore((s) => s.commitChange);

  const [drafting, setDrafting] = useState<Shape | null>(null);
  const dragStartRef = useRef<Shape[] | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Attach transformer to selected shape on selection change.
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedId, shapes, stageRef]);

  function getImagePointer(): { x: number; y: number } | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / scale, y: pos.y / scale };
  }

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (e.target !== e.target.getStage() && tool === 'select') return;
    if (tool === 'select') {
      selectShape(null);
      return;
    }
    const pointer = getImagePointer();
    if (!pointer) return;

    const id = nextShapeId();

    switch (tool) {
      case 'rect':
        setDrafting({
          id,
          type: 'rect',
          x: pointer.x,
          y: pointer.y,
          width: 0,
          height: 0,
          stroke: color,
          strokeWidth,
        });
        break;
      case 'arrow':
        setDrafting({
          id,
          type: 'arrow',
          points: [pointer.x, pointer.y, pointer.x, pointer.y],
          stroke: color,
          strokeWidth,
        });
        break;
      case 'highlight':
        setDrafting({
          id,
          type: 'highlight',
          x: pointer.x,
          y: pointer.y,
          width: 0,
          height: 0,
          fill: HIGHLIGHT_FILL,
        });
        break;
      case 'blur':
        setDrafting({
          id,
          type: 'blur',
          x: pointer.x,
          y: pointer.y,
          width: 0,
          height: 0,
          radius: BLUR_DEFAULT_RADIUS,
        });
        break;
      case 'text': {
        const newShape: Shape = {
          id,
          type: 'text',
          x: pointer.x,
          y: pointer.y,
          text: 'Texte',
          fontSize: 20,
          fill: color,
        };
        addShape(newShape);
        onEditText(id);
        break;
      }
      case 'number': {
        const index = nextNumberIndex(shapes);
        addShape({
          id,
          type: 'number',
          x: pointer.x,
          y: pointer.y,
          index,
          color,
          radius: 16,
        });
        break;
      }
    }
  }

  function handleMouseMove() {
    if (!drafting) return;
    const pointer = getImagePointer();
    if (!pointer) return;

    setDrafting((current) => {
      if (!current) return null;
      switch (current.type) {
        case 'rect':
        case 'highlight':
        case 'blur': {
          const start = { x: current.x, y: current.y };
          return {
            ...current,
            x: Math.min(start.x, pointer.x),
            y: Math.min(start.y, pointer.y),
            width: Math.abs(pointer.x - start.x),
            height: Math.abs(pointer.y - start.y),
          };
        }
        case 'arrow':
          return {
            ...current,
            points: [
              current.points[0],
              current.points[1],
              pointer.x,
              pointer.y,
            ],
          };
        default:
          return current;
      }
    });
  }

  function handleMouseUp() {
    if (!drafting) return;
    const draft = drafting;
    setDrafting(null);

    if (
      draft.type === 'rect' ||
      draft.type === 'highlight' ||
      draft.type === 'blur'
    ) {
      if (draft.width < MIN_DRAW_SIZE || draft.height < MIN_DRAW_SIZE) return;
    }
    if (draft.type === 'arrow') {
      const dx = draft.points[2] - draft.points[0];
      const dy = draft.points[3] - draft.points[1];
      if (Math.hypot(dx, dy) < MIN_DRAW_SIZE) return;
    }
    addShape(draft);
  }

  function handleStageMouseDownEmpty(
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    const stage = e.target.getStage();
    if (e.target === stage || e.target.name() === 'bg-image') {
      if (tool === 'select') selectShape(null);
    }
  }

  return (
    <Stage
      ref={stageRef}
      width={stageWidth}
      height={stageHeight}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => {
        handleStageMouseDownEmpty(e);
        handleMouseDown(e);
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={(e) => {
        handleStageMouseDownEmpty(e);
        handleMouseDown(e);
      }}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
    >
      <Layer listening={false}>
        <KonvaImage
          image={bgImage}
          width={imageWidth}
          height={imageHeight}
          name="bg-image"
        />
      </Layer>
      <Layer>
        {shapes.map((shape) => (
          <ShapeRenderer
            key={shape.id}
            shape={shape}
            bgImage={bgImage}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            isDraggable={tool === 'select'}
            onSelect={() => selectShape(shape.id)}
            onDoubleClick={
              shape.type === 'text' ? () => onEditText(shape.id) : undefined
            }
            onDragStart={() => {
              dragStartRef.current = shapes;
            }}
            onDragEnd={(x, y) => {
              if (dragStartRef.current) {
                commitChange(dragStartRef.current);
                dragStartRef.current = null;
              }
              if (shape.type === 'arrow') {
                const dx = shape.points[2] - shape.points[0];
                const dy = shape.points[3] - shape.points[1];
                updateShape(shape.id, {
                  points: [x, y, x + dx, y + dy],
                });
              } else {
                updateShape(shape.id, { x, y });
              }
            }}
          />
        ))}
        {drafting && (
          <ShapeRenderer
            shape={drafting}
            bgImage={bgImage}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            isDraggable={false}
            preview
          />
        )}
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          ignoreStroke
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          boundBoxFunc={(_oldBox, newBox) => {
            if (newBox.width < 8 || newBox.height < 8) return _oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}

interface ShapeRendererProps {
  shape: Shape;
  bgImage: HTMLImageElement;
  imageWidth: number;
  imageHeight: number;
  isDraggable: boolean;
  preview?: boolean;
  onSelect?: () => void;
  onDoubleClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
}

function ShapeRenderer({
  shape,
  bgImage,
  imageWidth,
  imageHeight,
  isDraggable,
  preview = false,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDragEnd,
}: ShapeRendererProps) {
  const commonHandlers = preview
    ? {}
    : {
        onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true;
          onSelect?.();
        },
        onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
          e.cancelBubble = true;
          onSelect?.();
        },
        onDblClick: onDoubleClick,
        onDragStart,
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
          onDragEnd?.(e.target.x(), e.target.y());
        },
        draggable: isDraggable,
      };

  switch (shape.type) {
    case 'rect':
      return (
        <Rect
          id={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          fillEnabled={false}
          strokeScaleEnabled={false}
          {...commonHandlers}
        />
      );
    case 'arrow':
      return (
        <Arrow
          id={shape.id}
          x={0}
          y={0}
          points={shape.points}
          stroke={shape.stroke}
          fill={shape.stroke}
          strokeWidth={shape.strokeWidth}
          pointerLength={shape.strokeWidth * 4}
          pointerWidth={shape.strokeWidth * 3.5}
          strokeScaleEnabled={false}
          {...commonHandlers}
        />
      );
    case 'highlight':
      return (
        <Rect
          id={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          {...commonHandlers}
        />
      );
    case 'text':
      return (
        <Text
          id={shape.id}
          x={shape.x}
          y={shape.y}
          text={shape.text}
          fontSize={shape.fontSize}
          fill={shape.fill}
          {...commonHandlers}
        />
      );
    case 'number':
      return (
        <Group id={shape.id} x={shape.x} y={shape.y} {...commonHandlers}>
          <Circle
            radius={shape.radius}
            fill={shape.color}
            stroke="#fff"
            strokeWidth={2}
            strokeScaleEnabled={false}
          />
          <Text
            text={String(shape.index)}
            fontSize={shape.radius * 1.1}
            fontStyle="bold"
            fill="#fff"
            x={-shape.radius}
            y={-shape.radius * 0.55}
            width={shape.radius * 2}
            align="center"
            listening={false}
          />
        </Group>
      );
    case 'blur':
      return (
        <BlurShapeRenderer
          shape={shape}
          bgImage={bgImage}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          {...commonHandlers}
        />
      );
  }
}

interface BlurShapeRendererProps {
  shape: import('@/lib/annotation/types').BlurShape;
  bgImage: HTMLImageElement;
  imageWidth: number;
  imageHeight: number;
  draggable?: boolean;
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTap?: (e: Konva.KonvaEventObject<TouchEvent>) => void;
  onDragStart?: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

function BlurShapeRenderer({
  shape,
  bgImage,
  imageWidth: _imageWidth,
  imageHeight: _imageHeight,
  ...handlers
}: BlurShapeRendererProps) {
  const imageRef = useRef<Konva.Image>(null);

  useEffect(() => {
    const node = imageRef.current;
    if (!node || !bgImage) return;
    node.cache();
    node.getLayer()?.batchDraw();
  }, [bgImage, shape.x, shape.y, shape.width, shape.height, shape.radius]);

  return (
    <Group id={shape.id} x={shape.x} y={shape.y} {...handlers}>
      <KonvaImage
        ref={imageRef}
        image={bgImage}
        x={0}
        y={0}
        width={shape.width}
        height={shape.height}
        crop={{
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        }}
        filters={[Konva.Filters.Blur]}
        blurRadius={shape.radius}
        listening={false}
      />
      <Rect
        width={shape.width}
        height={shape.height}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
    </Group>
  );
}
