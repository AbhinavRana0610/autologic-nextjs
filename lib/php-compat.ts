/**
 * Small, exact equivalents of the PHP string functions the original templates relied on.
 * They keep the generated markup and JSON-LD byte-identical to the PHP site.
 */

/** PCRE `\s` without the /u flag matches ASCII whitespace only (JS `\s` also matches NBSP etc.). */
export const WS = '[\\t\\n\\v\\f\\r ]';

/** htmlspecialchars($s, ENT_QUOTES, 'UTF-8') */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** trim() with PHP's default character list. */
export function phpTrim(s: string): string {
  return s.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
}

/** strip_tags() for the simple, well-formed markup used in the content. */
export function stripTags(s: string): string {
  return s.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?[a-zA-Z!][^>]*>/g, '');
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', rarr: '→', larr: '←', bull: '•',
  times: '×', deg: '°', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', hellip: '…', copy: '©', reg: '®', trade: '™',
  middot: '·', plusmn: '±', frac12: '½', micro: 'µ',
};

/** html_entity_decode($s, ENT_QUOTES, 'UTF-8') for the entities that occur in the content. */
export function htmlEntityDecode(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[name] ?? m;
  });
}

/** PHP empty() for a request field. */
export function phpEmpty(v: string | string[] | undefined): boolean {
  return v === undefined || v === '' || v === '0' || (Array.isArray(v) && v.length === 0);
}

/** urlencode(): spaces become "+", everything except [A-Za-z0-9_.-] is percent-encoded. */
export function phpUrlencode(s: string): string {
  return encodeURIComponent(s)
    .replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, '+');
}

/** json_encode($v, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) */
export function phpJson(value: unknown): string {
  return JSON.stringify(value, null, 4);
}
