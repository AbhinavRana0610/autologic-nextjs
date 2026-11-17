import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { pageMetadata, SiteDocument } from '@/components/SiteDocument';
import { isMarket, marketPagePaths, renderMarketListingPage, renderMarketProductPage } from '@/lib/market';

/** Location pages: /<market>/products.php and /<market>/<product>.php (also without ".php"). */

type Props = { params: Promise<{ slug: string; page: string }> };

export function generateStaticParams() {
  return marketPagePaths().map((path) => {
    const [slug, page] = path.split('/');
    return { slug, page: `${page}.php` };
  });
}

const getPage = cache((market: string, segment: string) => {
  if (!isMarket(market)) return null;
  const file = decodeURIComponent(segment);
  const page = file.endsWith('.php') ? file.slice(0, -4) : file;
  if (!marketPagePaths().includes(`${market}/${page}`)) return null;
  const requestPath = `/${market}/${file}`;
  return page === 'products' ? renderMarketListingPage(market, requestPath) : renderMarketProductPage(market, page, requestPath);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const rendered = getPage(slug, page);
  return rendered ? pageMetadata(rendered) : {};
}

export default async function MarketPage({ params }: Props) {
  const { slug, page } = await params;
  const rendered = getPage(slug, page);
  if (!rendered) notFound();
  return <SiteDocument page={rendered} />;
}
