import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderFooter, renderHeader } from './chrome';
import { renderMarketListingBody } from './market-listing';
import { headFields, hasRootPage, rootPageBody } from './pages';
import { esc, htmlEntityDecode, phpTrim, stripTags, WS } from './php-compat';
import { headSchemas } from './schema';
import { contentJson } from './site';
import type { ChromeOptions, JsonObject, PageVars, RenderedPage } from './types';

/** Location (market) pages: port of includes/market-data.php, market-root.php and market-listing.php. */

export interface MarketProduct {
  cat: string;
  name: string;
  label: string;
  banner?: string;
  hero: string;
  spec_img: string;
  card_name?: string;
  section_of?: string;
  no_card?: boolean;
  [key: string]: unknown;
}

export interface MarketData {
  siteUrl: string;
  imgNc: string;
  imgBb: string;
  markets: Record<string, { name: string }>;
  products: Record<string, MarketProduct>;
  categories: Record<string, { title: string; icon: string }>;
  marketFiles: Record<string, string[]>;
}

/** Content file of a market product page written as root-page paragraph replacements. */
export interface MarketProductContent {
  title: string;
  description: string;
  keyword: string;
  h1_kw?: string;
  /** Replacement HTML keyed by the index of the <p> element in the root page body. */
  p?: Record<string, string> | string[];
}

export function marketData(): MarketData {
  return contentJson<MarketData>('market', 'data.json');
}

export function isMarket(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(marketData().markets, slug);
}

/** Live market pages as "<market>/<page>" (product pages + products listing). */
export function marketPagePaths(): string[] {
  return contentJson<string[]>('market', 'pages.json');
}

export function marketContent<T>(market: string, page: string): T | null {
  if (!/^[a-z0-9-]+$/.test(page)) return null;
  const file = join(process.cwd(), 'content', 'market', market, `${page}.json`);
  return existsSync(file) ? contentJson<T>('market', market, `${page}.json`) : null;
}

/** market_href(): section-only items link to their host page's capabilities section. */
export function marketHref(slug: string): string {
  const host = marketData().products[slug]?.section_of;
  return host ? `${host}.php#supply-export` : `${slug}.php`;
}

/** market_img_abs() */
export function marketImgAbs(file: string): string {
  return `${marketData().siteUrl}img/products_hd/${file.split('?')[0]}`;
}

function marketChrome(isHomepage = false): ChromeOptions {
  return { base: '../', prodBase: '', marketProductsUrl: 'products.php', isHomepage, footerProductHref: marketHref };
}

/** Swaps the root page's <p> text, H1 and relative links for the market version (market-root.php). */
export function renderMarketRootBody(market: string, slug: string, c: MarketProductContent): string {
  const data = marketData();
  const marketName = data.markets[market].name;
  let body = rootPageBody(slug);

  // Unique H1 per market: the exact keyword from the keyword sheet, keeping the root's <em>.
  body = body.replace(/(<h1\b[^>]*>)(.*?)<\/h1>/s, (_m, open: string, inner: string) => {
    if (c.h1_kw) {
      const kw = esc(c.h1_kw);
      const k = kw.match(new RegExp(`^(.*?)${WS}+((?:Manufacturer|Supplier|Exporter)${WS}+in${WS}+.+)$`));
      if (inner.includes('<em>') && k) return `${open}${k[1]} <em>${k[2]}</em></h1>`;
      return `${open}${kw}</h1>`;
    }
    const loc = ` in ${esc(marketName)}`;
    const endsWithEm = new RegExp(`</em>${WS}*$`);
    const next = endsWithEm.test(inner) ? inner.replace(endsWithEm, `${loc}</em>`) : inner.replace(/[ \t\n\r\0\x0B]+$/, '') + loc;
    return `${open}${next}</h1>`;
  });

  // Paragraph text, keeping any leading icon / bold label (e.g. "<strong>Quotation Note:</strong>").
  const paras = c.p ?? {};
  const prefixRe = new RegExp(`^${WS}*(?:(?:<i\\b[^>]*></i>|<strong>[^<]*</strong>)${WS}*)*`);
  let index = 0;
  body = body.replace(/(<p\b[^>]*>)(.*?)(<\/p>)/gs, (whole, open: string, inner: string, close: string) => {
    const replacement = (paras as Record<string, string>)[String(index++)];
    if (replacement === undefined || replacement === null) return whole;
    const prefix = inner.match(prefixRe)?.[0] ?? '';
    return open + prefix + replacement + close;
  });

  // Assets live one level up; product links stay inside the market folder when a file of that name exists there.
  const files = new Set(data.marketFiles[market] ?? []);
  body = body.replace(
    /\b(src|href)="(?!https?:|\/\/|#|mailto:|tel:|javascript:|\.\.\/|data:)([^"#?]+)([^"]*)"/g,
    (_m, attr: string, path: string, rest: string) => {
      const isPhp = path.endsWith('.php');
      const pslug = path.slice(0, -4);
      if (attr === 'href' && isPhp && data.products[pslug]?.section_of) return `href="${marketHref(pslug)}"`;
      const inMarket = isPhp && files.has(path);
      return `${attr}="${inMarket ? '' : '../'}${path}${rest}"`;
    },
  );
  return body.replaceAll("url('img/", "url('../img/");
}

/** FAQPage entries from the rendered questions and (market) answers. */
function faqsFromBody(body: string): JsonObject[] {
  const re = new RegExp(
    `<button[^>]*class="faq-question"[^>]*>(.*?)</button>${WS}*<div[^>]*class="faq-answer"[^>]*>(.*?)</div>`,
    'gs',
  );
  const collapse = new RegExp(`${WS}+`, 'g');
  return [...body.matchAll(re)].map((f) => ({
    '@type': 'Question',
    name: phpTrim(htmlEntityDecode(stripTags(f[1]))),
    acceptedAnswer: { '@type': 'Answer', text: phpTrim(htmlEntityDecode(stripTags(f[2])).replace(collapse, ' ')) },
  }));
}

function marketBreadcrumb(market: string, extra: { name: string; item: string }[]): JsonObject {
  const { siteUrl, markets } = marketData();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Global', item: `${siteUrl}location.php` },
      { '@type': 'ListItem', position: 3, name: `${markets[market].name} Products`, item: `${siteUrl}${market}/products.php` },
      ...extra.map((e, i) => ({ '@type': 'ListItem', position: 4 + i, ...e })),
    ],
  };
}

/** A market product page (<market>/<slug>.php) built from the root page. Returns null when it does not exist. */
export function renderMarketProductPage(market: string, slug: string, requestPath: string): RenderedPage | null {
  const data = marketData();
  const product = data.products[slug];
  const c = product ? marketContent<MarketProductContent>(market, slug) : null;
  // Only the root-paragraph format is live; every product page has a root page to build from.
  if (!c || !c.p || !hasRootPage(slug)) return null;

  const body = renderMarketRootBody(market, slug, c);
  const faqs = faqsFromBody(body);
  const pageUrl = `${data.siteUrl}${market}/${slug}.php`;
  const vars: PageVars = {
    title: c.title,
    description: c.description,
    keyword: c.keyword,
    canonical: pageUrl,
    productSchema: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      url: pageUrl,
      image: [...new Set([marketImgAbs(product.hero), marketImgAbs(product.spec_img)])],
      description: c.description,
      category: data.categories[product.cat].title,
      brand: { '@type': 'Brand', name: 'Autologic Industries' },
      manufacturer: { '@id': `${data.siteUrl}#organization` },
    },
    faqSchema: faqs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs } : null,
    breadcrumbSchema: marketBreadcrumb(market, [{ name: product.name, item: pageUrl }]),
  };
  const chrome = marketChrome();
  return {
    ...headFields(vars, requestPath),
    schemas: headSchemas(vars, requestPath),
    html: renderHeader(chrome) + body + renderFooter(chrome),
  };
}

/** Content file of <market>/products.php. */
export interface MarketListingContent {
  title: string;
  description: string;
  keyword: string;
  banner_desc: string;
  h1: [string, string];
  hero_sub: string;
  hero_alt: string;
  hero: string[];
  categories: Record<string, { title: [string, string]; intro: string }>;
  cards: Record<string, string>;
  network: { title: string; paras: string[]; list: string[] }[];
  cta: { title: string; text: string };
  faq_intro: string;
  faqs: [string, string][];
}

/** <market>/products.php */
export function renderMarketListingPage(market: string, requestPath: string): RenderedPage | null {
  const data = marketData();
  const c = isMarket(market) ? marketContent<MarketListingContent>(market, 'products') : null;
  if (!c) return null;

  const marketName = data.markets[market].name;
  const pageUrl = `${data.siteUrl}${market}/products.php`;
  const itemList: JsonObject[] = [];
  for (const [slug, p] of Object.entries(data.products)) {
    if (p.no_card || p.section_of) continue; // only products with a page of their own
    itemList.push({ '@type': 'ListItem', position: itemList.length + 1, name: p.card_name ?? p.name, url: `${data.siteUrl}${market}/${slug}.php` });
  }
  const breadcrumb = marketBreadcrumb(market, []);
  const vars: PageVars = {
    title: c.title,
    description: c.description,
    keyword: c.keyword,
    canonical: pageUrl,
    productSchema: false, // listing page: suppress the default Product schema
    faqSchema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: stripTags(a) } })),
    },
    breadcrumbSchema: breadcrumb,
  };
  const itemListSchema: JsonObject = { '@context': 'https://schema.org', '@type': 'ItemList', name: `${marketName} Products`, itemListElement: itemList };
  const chrome = marketChrome();
  return {
    ...headFields(vars, requestPath),
    schemas: headSchemas(vars, requestPath),
    html: renderHeader(chrome) + renderMarketListingBody(market, c, breadcrumb, itemListSchema) + renderFooter(chrome),
  };
}
