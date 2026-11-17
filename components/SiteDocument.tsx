import type { Metadata } from 'next';
import { phpJson } from '@/lib/php-compat';
import type { RenderedPage } from '@/lib/types';

/**
 * Renders a page the way the PHP site did: the JSON-LD blocks, then the site chrome and page
 * markup (with their own inline <style> and <script> blocks, in the original order).
 *
 * The markup is injected as trusted HTML from the project's own content files. It is wrapped in a
 * `display: contents` element so the wrapper adds no box and the original layout/CSS is unaffected.
 * Inline scripts run while the browser parses the server-rendered document, exactly as before.
 * Internal links are plain <a href> links, so navigation is a full page load like the PHP site.
 */
export function SiteDocument({ page }: { page: RenderedPage }) {
  return (
    <>
      {page.schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: `\n${phpJson(schema)}\n` }} />
      ))}
      {/* The site's own scripts (splash, text-split animations, reveals) change this DOM before
          React hydrates; React leaves the injected HTML alone, so the dev-only warning is suppressed. */}
      <div id="site-root" style={{ display: 'contents' }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
    </>
  );
}

export function pageMetadata(page: RenderedPage): Metadata {
  return {
    title: { absolute: page.title },
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: page.canonical },
  };
}
