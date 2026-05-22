import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  htmlContent: string | undefined;
  htmlSize: number | undefined;
  filename: string;
}

export function CaptureHtmlPanel({ htmlContent, htmlSize, filename }: Props) {
  const [copied, setCopied] = useState(false);

  if (!htmlContent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p>No HTML captured.</p>
        <p className="text-xs">
          HTML is captured automatically for new captures.
        </p>
      </div>
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(htmlContent ?? '');
      setCopied(true);
      toast.success('HTML copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  }

  function handleDownload() {
    const blob = new Blob([htmlContent ?? ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sizeKb = htmlSize ? (htmlSize / 1024).toFixed(1) : '?';

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {sizeKb} kB · {htmlContent.length.toLocaleString('en-US')} characters
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1 h-3 w-3 text-green-600" />
            ) : (
              <Copy className="mr-1 h-3 w-3" />
            )}
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="mr-1 h-3 w-3" />
            Download
          </Button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 font-mono text-[11px] leading-relaxed">
        {htmlContent}
      </pre>
    </div>
  );
}
