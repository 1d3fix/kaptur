import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TextShape } from '@/lib/annotation/types';

interface Props {
  shape: TextShape;
  container: HTMLDivElement;
  scale: number;
  onChange: (text: string) => void;
  onDone: () => void;
}

export function TextEditorOverlay({
  shape,
  container,
  scale,
  onChange,
  onDone,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(shape.text);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  function handleDone() {
    onChange(value.trim() || 'Texte');
    onDone();
  }

  const rect = container.getBoundingClientRect();
  const left = rect.left + shape.x * scale;
  const top = rect.top + shape.y * scale;

  return createPortal(
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleDone();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleDone();
        }
      }}
      style={{
        position: 'fixed',
        left,
        top,
        minWidth: 80,
        fontSize: shape.fontSize * scale,
        color: shape.fill,
        background: 'rgba(255,255,255,0.92)',
        border: '1px dashed rgba(0,0,0,0.4)',
        outline: 'none',
        padding: '2px 4px',
        resize: 'none',
        fontFamily: 'inherit',
        lineHeight: 1.2,
        zIndex: 9999,
      }}
      rows={1}
    />,
    document.body,
  );
}
