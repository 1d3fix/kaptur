export interface ParsedQuery {
  text: string;
  sessionSlug?: string;
  domain?: string;
  tag?: string;
  htmlKeyword?: string;
  mediaKeyword?: string;
}

const FILTER_RE = /(\w+):(\S+)/g;

export function parseQuery(input: string): ParsedQuery {
  const out: ParsedQuery = { text: '' };
  let rest = input;
  rest = rest.replace(FILTER_RE, (match, key: string, value: string) => {
    switch (key.toLowerCase()) {
      case 'session':
        out.sessionSlug = value;
        return '';
      case 'domain':
        out.domain = value;
        return '';
      case 'tag':
        out.tag = value;
        return '';
      case 'html':
        out.htmlKeyword = value;
        return '';
      case 'media':
        out.mediaKeyword = value;
        return '';
      default:
        return match;
    }
  });
  out.text = rest.trim().replace(/\s+/g, ' ');
  return out;
}
