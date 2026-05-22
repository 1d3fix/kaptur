import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { BookOpen, Camera, Hash, Search, Settings } from 'lucide-react';
import { SearchDialog } from '@/components/search/SearchDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AppLayout({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b px-6">
        <Link
          to="/sessions"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Camera className="h-4 w-4" />
          Kaptur
          <span className="ml-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            beta
          </span>
        </Link>

        <nav className="ml-4 flex h-full items-center gap-0.5 text-sm">
          <Link
            to="/sessions"
            className="flex h-full items-center border-b-2 border-transparent px-3 text-muted-foreground transition-colors hover:text-foreground [&.active]:border-foreground [&.active]:text-foreground"
            activeProps={{ className: 'active' }}
          >
            Sessions
          </Link>
          <Link
            to="/tags"
            className="flex h-full items-center gap-1.5 border-b-2 border-transparent px-3 text-muted-foreground transition-colors hover:text-foreground [&.active]:border-foreground [&.active]:text-foreground"
            activeProps={{ className: 'active' }}
          >
            <Hash className="h-3.5 w-3.5" />
            Tags
          </Link>
          <Link
            to="/settings"
            className="flex h-full items-center gap-1.5 border-b-2 border-transparent px-3 text-muted-foreground transition-colors hover:text-foreground [&.active]:border-foreground [&.active]:text-foreground"
            activeProps={{ className: 'active' }}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          <Link
            to="/features"
            className="flex h-full items-center gap-1.5 border-b-2 border-transparent px-3 text-muted-foreground transition-colors hover:text-foreground [&.active]:border-foreground [&.active]:text-foreground"
            activeProps={{ className: 'active' }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Features
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search…</span>
            <kbd className="ml-3 hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">{children}</main>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
