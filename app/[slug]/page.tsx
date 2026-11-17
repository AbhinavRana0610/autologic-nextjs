import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { pageMetadata, SiteDocument } from '@/components/SiteDocument';
import { hasRootPage, renderRootPage, rootPageSlugs } from '@/lib/pages';

/**
 * Root pages at their original URLs (/about-us.php, /2-wheeler-clutch-hub.php, /index.php ...).
 * Like the .htaccess "clean URL" rule, the same page is also served without ".php".
 */

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return rootPageSlugs().map((slug) => ({ slug: `${slug}.php` }));
}

const getPage = cache((segment: string) => {
  const file = decodeURIComponent(segment);
  const slug = file.endsWith('.php') ? file.slice(0, -4) : file;
  return hasRootPage(slug) ? renderRootPage(slug, `/${file}`) : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage((await params).slug);
  return page ? pageMetadata(page) : {};
}

export default async function RootPage({ params }: Props) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  return <SiteDocument page={page} />;
}
