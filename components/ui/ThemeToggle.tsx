import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/hooks/useTheme';

const ICONS: Record<Theme, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const NEXT: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const LABELS: Record<Theme, string> = {
  system: 'System theme — click for light',
  light: 'Light theme — click for dark',
  dark: 'Dark theme — click for system',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      title={LABELS[theme]}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
