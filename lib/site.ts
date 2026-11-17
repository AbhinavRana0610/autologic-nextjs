import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SITE_ORIGIN = 'https://autologicindustries.com';
export const SITE_URL = `${SITE_ORIGIN}/`;

/** Defaults from header.php, used when a page does not set its own values. */
export const DEFAULT_TITLE = 'Two & Three Wheeler Parts Manufacturer | Autologic';
export const DEFAULT_DESCRIPTION =
  'Leading two and three wheeler auto parts manufacturer. Autologic produces high-performance clutch kits and precision components.';
export const DEFAULT_KEYWORDS =
  'two wheeler auto parts manufacturer, three wheeler parts manufacturer, clutch and pressure plate manufacturer, clutch kit manufacturer, motorcycle spare parts manufacturer, auto rickshaw parts manufacturer, automotive parts manufacturer, aluminium die casting manufacturer, precision die casting parts manufacturer, bike engine components manufacturer, automotive clutch braking parts manufacturer, customised die casting solution manufacturer, automotive components exporter, OEM auto parts manufacturer, Indian automotive spare parts supplier';

const cache = new Map<string, string>();

function readCached(path: string): string {
  let data = cache.get(path);
  if (data === undefined) {
    data = readFileSync(path, 'utf8');
    if (process.env.NODE_ENV === 'production') cache.set(path, data);
  }
  return data;
}

/** Reads a file under content/ (cached per server process in production). */
export function contentFile(...parts: string[]): string {
  return readCached(join(process.cwd(), 'content', ...parts));
}

export function contentJson<T>(...parts: string[]): T {
  return JSON.parse(contentFile(...parts)) as T;
}

/** Reads a file under templates/. */
export function templateFile(name: string): string {
  return readCached(join(process.cwd(), 'templates', name));
}
