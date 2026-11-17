import type { NextRequest } from 'next/server';

/**
 * $_POST equivalent: fields in submission order. Like PHP, a repeated plain name keeps the last
 * value and "name[]" fields become an array under "name".
 */
export async function postFields(request: NextRequest): Promise<Map<string, string | string[]>> {
  const fields = new Map<string, string | string[]>();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fields;
  }
  for (const [rawKey, value] of form.entries()) {
    if (typeof value !== 'string') continue; // no file uploads on this site
    if (rawKey.endsWith('[]')) {
      const key = rawKey.slice(0, -2);
      const prev = fields.get(key);
      fields.set(key, Array.isArray(prev) ? [...prev, value] : [value]);
    } else {
      fields.set(rawKey, value);
    }
  }
  return fields;
}

export function field(fields: Map<string, string | string[]>, key: string): string {
  const v = fields.get(key);
  return Array.isArray(v) ? v.join(', ') : (v ?? '');
}

/** Request host without port and "www.", sanitised like send-mail.php. */
export function requestHost(request: NextRequest): string {
  const raw = (request.headers.get('host') ?? 'localhost').replace(/:\d+$/, '');
  return raw.replace(/[^a-z0-9.-]/gi, '').replace(/^www\./i, '');
}

export function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Date in India Standard Time, formatted with PHP date() letters (d, m, Y, H, i, s, M, h, A). */
export function istDate(format: string, date = new Date()): string {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const H = ist.getUTCHours();
  const parts: Record<string, string> = {
    d: pad(ist.getUTCDate()),
    m: pad(ist.getUTCMonth() + 1),
    M: months[ist.getUTCMonth()],
    Y: String(ist.getUTCFullYear()),
    H: pad(H),
    h: pad(H % 12 || 12),
    i: pad(ist.getUTCMinutes()),
    s: pad(ist.getUTCSeconds()),
    A: H < 12 ? 'AM' : 'PM',
  };
  return format.replace(/[dmMYHhisA]/g, (c) => parts[c]);
}
