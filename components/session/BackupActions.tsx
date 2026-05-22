import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadKapturFile, importKapturFile } from '@/lib/export/kaptur';

export function BackupActions() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    const t = toast.loading('Preparing export…', {
      duration: Infinity,
    });
    try {
      await downloadKapturFile();
      toast.dismiss(t);
      toast.success('.kaptur export downloaded.');
    } catch (err) {
      toast.dismiss(t);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ok = window.confirm(
      `Importing "${file.name}" will entirely replace the current database (sessions, captures, tags, notes, annotations). This action is irreversible. Continue?`,
    );
    if (!ok) return;
    setBusy(true);
    const t = toast.loading('Importing…', { duration: Infinity });
    try {
      const summary = await importKapturFile(file);
      toast.dismiss(t);
      toast.success(
        `Import OK: ${summary.sessions} session(s), ${summary.captures} capture(s), ${summary.tags} tag(s).`,
      );
    } catch (err) {
      toast.dismiss(t);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={busy}
        title="Export the full database as a .kaptur file"
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={pickFile}
        disabled={busy}
        title="Import a .kaptur file (replaces the entire database)"
      >
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        Import
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".kaptur,application/json"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}
