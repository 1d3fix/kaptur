import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    { checked = false, onCheckedChange, disabled, className, id, ...rest },
    ref,
  ) => {
    const isChecked = checked === true || checked === 'indeterminate';
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        id={id}
        aria-checked={
          checked === 'indeterminate' ? 'mixed' : checked ? 'true' : 'false'
        }
        aria-label={rest['aria-label']}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onCheckedChange?.(!isChecked);
        }}
        className={cn(
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          isChecked && 'bg-primary text-primary-foreground',
          className,
        )}
      >
        {checked === 'indeterminate' ? (
          <span className="h-0.5 w-2.5 bg-current" />
        ) : checked === true ? (
          <Check className="h-3 w-3" />
        ) : null}
      </button>
    );
  },
);
Checkbox.displayName = 'Checkbox';
