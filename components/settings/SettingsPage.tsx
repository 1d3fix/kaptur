import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AVAILABLE_TOKENS,
  applyTemplate,
  formatFilename,
} from '@/lib/export/naming';
import {
  DEFAULT_FILENAME_TEMPLATE,
  getExportSettings,
  setFileNameTemplate,
  getBannerLocale,
  setBannerLocale,
  type BannerLocale,
} from '@/lib/db/settings';
import { getAllSessions } from '@/lib/db/queries';
import { db, type Capture, type Session } from '@/lib/db/schema';

export function SettingsPage() {
  const [template, setTemplate] = useState<string>(DEFAULT_FILENAME_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerLocale, setBannerLocaleState] = useState<BannerLocale>('en');

  const sampleCaptures = useLiveQuery(() => db.captures.limit(3).toArray());
  const sessions = useLiveQuery(() =>
    getAllSessions({ includeArchived: true }),
  );

  useEffect(() => {
    void Promise.all([getExportSettings(), getBannerLocale()]).then(
      ([s, locale]) => {
        setTemplate(s.fileNameTemplate);
        setBannerLocaleState(locale);
        setLoading(false);
      },
    );
  }, []);

  async function handleBannerLocaleChange(checked: boolean) {
    const locale: BannerLocale = checked ? 'fr' : 'en';
    setBannerLocaleState(locale);
    try {
      await setBannerLocale(locale);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const previewNames = useMemo(() => {
    return buildPreview(template, sampleCaptures, sessions ?? []);
  }, [template, sampleCaptures, sessions]);

  async function handleSave() {
    setSaving(true);
    try {
      await setFileNameTemplate(template.trim() || DEFAULT_FILENAME_TEMPLATE);
      toast.success('Naming convention saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setTemplate(DEFAULT_FILENAME_TEMPLATE);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Customize the filenames of captures exported as ZIP.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-md border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Naming convention</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={template === DEFAULT_FILENAME_TEMPLATE}
            title="Reset to default template"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Default
          </Button>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="template" className="text-xs">
            Template
          </Label>
          <Input
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            disabled={loading}
            placeholder={DEFAULT_FILENAME_TEMPLATE}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            The <code className="font-mono">.png</code> extension is appended
            automatically. Duplicate names are disambiguated with a{' '}
            <code className="font-mono">-2</code>,{' '}
            <code className="font-mono">-3</code>, etc. suffix.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Preview</Label>
          <div className="overflow-hidden rounded-md border bg-background">
            {previewNames.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                Create a capture to see a preview.
              </p>
            ) : (
              <ul className="divide-y">
                {previewNames.map((name, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 px-3 py-1.5 font-mono text-xs"
                  >
                    <span className="w-4 text-muted-foreground">{i + 1}.</span>
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <Button size="sm" onClick={handleSave} disabled={loading || saving}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-md border bg-card p-4">
        <h2 className="text-base font-semibold">Available tokens</h2>
        <dl className="grid gap-2 text-xs">
          {AVAILABLE_TOKENS.map((t) => (
            <div
              key={t.token}
              className="grid grid-cols-[120px_1fr_auto] gap-3 border-b py-1 last:border-b-0"
            >
              <dt>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                  {t.token}
                </code>
              </dt>
              <dd className="text-muted-foreground">{t.description}</dd>
              <dd className="font-mono text-muted-foreground">{t.example}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Separate tokens with <code className="font-mono">_</code>,{' '}
          <code className="font-mono">-</code>, or{' '}
          <code className="font-mono">/</code>. The{' '}
          <code className="font-mono">/</code> creates a folder tree in the ZIP.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-md border bg-card p-4">
        <div>
          <h2 className="text-base font-semibold">Banner</h2>
          <p className="text-sm text-muted-foreground">
            Labels embedded in the capture banner (timestamp and HTML hash).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="banner-locale"
            checked={bannerLocale === 'fr'}
            disabled={loading}
            onCheckedChange={(v) => void handleBannerLocaleChange(v === true)}
          />
          <Label htmlFor="banner-locale" className="text-sm font-normal">
            Display banner labels in French
            <span className="ml-2 text-xs text-muted-foreground">
              (default: English)
            </span>
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Applies to new captures. Existing captures are not affected.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-md border bg-card p-4 text-xs">
        <h2 className="text-base font-semibold">About</h2>
        <dl className="grid grid-cols-[140px_1fr] gap-y-1">
          <dt className="text-muted-foreground">Version</dt>
          <dd className="font-mono">1.0.0</dd>
          <dt className="text-muted-foreground">.kaptur format</dt>
          <dd className="font-mono">v1</dd>
          <dt className="text-muted-foreground">License</dt>
          <dd>MIT © 2026 1d3fix</dd>
          <dt className="text-muted-foreground">Source</dt>
          <dd>
            <a
              href="https://github.com/1d3fix/kaptur"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              github.com/1d3fix/kaptur
            </a>
          </dd>
          <dt className="text-muted-foreground">Privacy</dt>
          <dd>100% local. No telemetry, no remote calls, ever.</dd>
        </dl>
      </section>
    </div>
  );
}

function buildPreview(
  template: string,
  captures: Capture[] | undefined,
  sessions: Session[],
): string[] {
  const safeTemplate = template.trim() || DEFAULT_FILENAME_TEMPLATE;
  if (!captures || captures.length === 0) {
    const tokens = {
      index: '003',
      timestamp: '2026-05-15_14-32-15',
      date: '2026-05-15',
      time: '14-32-15',
      name: 'financial-report',
      domain: 'wikipedia-org',
      session: 'investigation-1',
      type: 'visible',
      hash: 'a3f1b2c4',
    };
    return [`${applyTemplate(safeTemplate, tokens)}.png`];
  }
  return captures.slice(0, 3).map((c, i) => {
    const session = sessions.find((s) => s.id === c.sessionId);
    return formatFilename(safeTemplate, {
      capture: c,
      session,
      index: i + 1,
    });
  });
}
