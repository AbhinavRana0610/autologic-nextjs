import type { Metadata } from 'next';
import { cache } from 'react';
import { pageMetadata, SiteDocument } from '@/components/SiteDocument';
import { renderRootPage } from '@/lib/pages';

/** Home page (index.php). */
const getPage = cache(() => renderRootPage('index', '/'));

export function generateMetadata(): Metadata {
  return pageMetadata(getPage());
}

export default function HomePage() {
  return <SiteDocument page={getPage()} />;
}
