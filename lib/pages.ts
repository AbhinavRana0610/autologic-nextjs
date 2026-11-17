import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderFooter, renderHeader } from './chrome';
import { phpTrim } from './php-compat';
import { canonicalFor, headSchemas } from './schema';
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_TITLE, contentFile, contentJson } from './site';
import type { PageVars, RenderedPage } from './types';

/** Root pages: content/pages/<slug>.html (body) + <slug>.json (variables from the top of the PHP file). */

export interface RootPage extends PageVars {
  slug: string;
}

export function rootPageSlugs(): string[] {
  return readdirSync(join(process.cwd(), 'content', 'pages'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5));
}

export function hasRootPage(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && existsSync(join(process.cwd(), 'content', 'pages', `${slug}.json`));
}

export function loadRootPage(slug: string): { vars: RootPage; body: string } {
  return {
    vars: contentJson<RootPage>('pages', `${slug}.json`),
    body: rootPageBody(slug),
  };
}

/** Raw body markup of a root page (market pages are built from it). */
export function rootPageBody(slug: string): string {
  return contentFile('pages', `${slug}.html`);
}

/** Head values exactly as header.php printed them. */
export function headFields(vars: PageVars, requestPath: string) {
  return {
    title: vars.title !== undefined ? phpTrim(vars.title) : DEFAULT_TITLE,
    description: vars.description !== undefined ? phpTrim(vars.description) : DEFAULT_DESCRIPTION,
    keywords: vars.keyword !== undefined ? phpTrim(vars.keyword) : DEFAULT_KEYWORDS,
    canonical: canonicalFor(vars, requestPath),
  };
}

/** A root page rendered for the given request path (e.g. "/about-us.php", "/about-us", "/"). */
export function renderRootPage(slug: string, requestPath: string): RenderedPage {
  const { vars, body } = loadRootPage(slug);
  const chrome = { base: '', prodBase: '', isHomepage: !!vars.isHomepage };
  return {
    ...headFields(vars, requestPath),
    schemas: headSchemas(vars, requestPath),
    // PHP swallows the newline right after "include('header.php');?>"; market pages (built from the raw body) keep it.
    html: renderHeader(chrome) + body.replace(/^\r?\n/, '') + renderFooter(chrome),
  };
}
