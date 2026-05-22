import {
  Camera,
  Clapperboard,
  Code2,
  Download,
  Hash,
  Image,
  Layers,
  Pencil,
  Search,
  StickyNote,
} from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Layers className="h-4 w-4" />,
    title: 'Sessions',
    description:
      'Organize captures into named sessions (projects, audits, research threads…). Each session has a name, optional description, and color. Sessions can be archived when finished.',
  },
  {
    icon: <Camera className="h-4 w-4" />,
    title: 'Captures',
    description:
      'Capture the visible area of a tab or draw a region to capture a specific zone. Each capture stores the screenshot, the page URL, domain, title, and timestamp.',
  },
  {
    icon: <Pencil className="h-4 w-4" />,
    title: 'Annotations',
    description:
      'Draw directly on a capture: arrows, rectangles, freehand lines, text. Full undo/redo. Annotations are stored non-destructively alongside the original image.',
  },
  {
    icon: <Hash className="h-4 w-4" />,
    title: 'Tags',
    description:
      'Tag captures with free-form labels to cross-reference across sessions. Tags are searchable and filterable from the session view.',
  },
  {
    icon: <StickyNote className="h-4 w-4" />,
    title: 'Notes',
    description:
      'Attach a plain-text note to any capture for context, observations, or follow-up actions.',
  },
  {
    icon: <Code2 className="h-4 w-4" />,
    title: 'HTML snapshot',
    description:
      'Optionally save the full raw HTML of the captured page. The HTML is stored locally and is searchable with the html: operator (see below).',
  },
  {
    icon: <Image className="h-4 w-4" />,
    title: 'Media collection',
    description:
      'Extract and locally store all images, videos and audio assets referenced on the page at capture time. Media URLs are searchable with the media: operator.',
  },
  {
    icon: <Download className="h-4 w-4" />,
    title: 'Export',
    description:
      'Download any capture as a PNG. Bulk export sessions as a ZIP archive containing screenshots, metadata, and optionally saved HTML and media assets.',
  },
  {
    icon: <Clapperboard className="h-4 w-4" />,
    title: 'View & sort',
    description:
      'Switch between grid and list view inside a session. Sort by date (newest/oldest) or by name (A→Z / Z→A). Filters by date range, domain, and tags are available in the toolbar.',
  },
];

interface SearchOperator {
  syntax: string;
  description: string;
  example: string;
  slow?: boolean;
}

const operators: SearchOperator[] = [
  {
    syntax: 'free text',
    description:
      'Fuzzy full-text search across capture names, page titles, URLs, domains, notes, and tags.',
    example: 'login page',
  },
  {
    syntax: 'session:slug',
    description:
      'Restrict results to a specific session identified by its slug.',
    example: 'session:q1-audit',
  },
  {
    syntax: 'domain:value',
    description: 'Filter by domain — substring match.',
    example: 'domain:github.com',
  },
  {
    syntax: 'tag:name',
    description: 'Filter captures that carry a specific tag (exact match).',
    example: 'tag:bug',
  },
  {
    syntax: 'html:keyword',
    description:
      'Scan the raw HTML of every capture for a keyword. Searches tag names, attributes, href, class names, inline scripts — everything. Returns a snippet showing the match in context.',
    example: 'html:data-tracking',
    slow: true,
  },
  {
    syntax: 'media:keyword',
    description:
      'Scan all collected media URLs for a substring. Useful to find captures that reference a specific CDN, file name, or resource path.',
    example: 'media:cdn.example.com',
    slow: true,
  },
];

export function FeaturesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Features</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A reference of everything Kaptur can do.
        </p>
      </div>

      <section className="space-y-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex gap-3 rounded-md border bg-card px-4 py-3"
          >
            <span className="mt-0.5 shrink-0 text-muted-foreground">
              {f.icon}
            </span>
            <div>
              <p className="text-sm font-medium">{f.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">
            Search operators
          </h2>
          <span className="text-xs text-muted-foreground">
            — open with{' '}
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </span>
        </div>

        <div className="overflow-hidden rounded-md border">
          {operators.map((op, i) => (
            <div
              key={op.syntax}
              className={`grid grid-cols-[160px_1fr] gap-4 px-4 py-3 text-sm ${
                i < operators.length - 1 ? 'border-b' : ''
              }`}
            >
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[12px] font-medium">
                  {op.syntax}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  e.g. {op.example}
                </span>
                {op.slow && (
                  <span className="w-fit rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-400">
                    DB scan
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{op.description}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Operators can be combined:{' '}
          <span className="font-mono">html:analytics domain:github.com</span>{' '}
          returns captures where the HTML contains &quot;analytics&quot;{' '}
          <em>and</em> the domain is github.com.
          <br />
          <span className="text-amber-700 dark:text-amber-400">
            DB scan
          </span>{' '}
          operators scan the full database and may take a moment on large
          libraries.
        </p>
      </section>
    </div>
  );
}
