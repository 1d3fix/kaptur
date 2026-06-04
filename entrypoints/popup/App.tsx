import { useState } from 'react';
import { Camera, Crop, ExternalLink, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SessionSelector } from '@/components/session/SessionSelector';
import { sendMessage } from '@/lib/messaging/client';
import type {
  CaptureCreatedPayload,
  KapturMessage,
} from '@/lib/messaging/types';
import { useSessionStore } from '@/stores/session';

function openDashboard(hash: string = '#/sessions') {
  const url = browser.runtime.getURL('/app.html') + hash;
  void browser.tabs.create({ url });
  window.close();
}

function App() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const hydrated = useSessionStore((s) => s.hydrated);
  const [busy, setBusy] = useState(false);

  const canCapture = hydrated && activeSessionId !== null && !busy;

  async function runCapture(
    message: Extract<
      KapturMessage,
      { type: 'CAPTURE_VISIBLE' | 'CAPTURE_FULL_PAGE' }
    >,
  ) {
    setBusy(true);
    try {
      const res = await sendMessage<CaptureCreatedPayload>(message);
      if (res.ok) {
        toast.success(`Capture saved: "${res.data?.customName ?? '…'}"`);
      } else {
        toast.error(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleCaptureVisible() {
    if (activeSessionId === null) return;
    void runCapture({
      type: 'CAPTURE_VISIBLE',
      sessionId: activeSessionId,
    });
  }

  function handleCaptureFullPage() {
    if (activeSessionId === null) return;
    void runCapture({
      type: 'CAPTURE_FULL_PAGE',
      sessionId: activeSessionId,
    });
  }

  async function handleCaptureRegion() {
    if (activeSessionId === null) return;
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'CAPTURE_REGION_START',
        sessionId: activeSessionId,
      });
      if (res.ok) {
        toast.info('Select the region to capture in the tab.');
        setTimeout(() => window.close(), 200);
      } else {
        toast.error(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex w-[320px] flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          <span className="text-sm font-semibold tracking-tight">Kaptur</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            beta
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-col gap-0 divide-y">
        {/* Session selector */}
        <section className="px-4 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Active session
          </p>
          <SessionSelector />
          {activeSessionId === null && hydrated && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              Select or create a session to enable capture.
            </p>
          )}
        </section>

        {/* Capture actions */}
        <section className="flex flex-col gap-2 px-4 py-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Capture
          </p>
          <Button
            size="sm"
            onClick={handleCaptureVisible}
            disabled={!canCapture}
            className="justify-start"
            title={
              activeSessionId === null
                ? 'Select an active session'
                : 'Capture the visible area of the tab'
            }
          >
            <Camera className="mr-2 h-4 w-4" />
            Capture visible
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCaptureFullPage}
            disabled={!canCapture}
            className="justify-start"
            title={
              activeSessionId === null
                ? 'Select an active session'
                : 'Capture the full scrollable page'
            }
          >
            <ScrollText className="mr-2 h-4 w-4" />
            Capture full page
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCaptureRegion}
            disabled={!canCapture}
            className="justify-start"
            title={
              activeSessionId === null
                ? 'Select an active session'
                : 'Select an area with the mouse'
            }
          >
            <Crop className="mr-2 h-4 w-4" />
            Capture region
          </Button>
        </section>

        {/* Dashboard link */}
        <section className="px-4 py-3">
          <button
            type="button"
            onClick={() => openDashboard()}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span>Open Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </section>
      </div>

      <Toaster />
    </main>
  );
}

export default App;
