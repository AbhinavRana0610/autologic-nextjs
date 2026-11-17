import { phpTrim } from './php-compat';
import { SITE_ORIGIN } from './site';
import type { JsonObject, PageVars } from './types';

/** Port of the schema block in header.php (WebSite, Organization, BreadcrumbList, Product, FAQ). */

const WEBSITE_SCHEMA: JsonObject = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://autologicindustries.com/#website',
  url: 'https://autologicindustries.com/',
  name: 'Autologic Industries',
  description: 'Leading manufacturer of two wheeler & three-wheeler auto parts, clutch kits, and precision die casting.',
  publisher: { '@id': 'https://autologicindustries.com/#organization' },
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://autologicindustries.com/?s={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const ORG_SCHEMA: JsonObject = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://autologicindustries.com/#organization',
  name: 'Autologic Industries',
  url: 'https://autologicindustries.com/',
  logo: 'https://autologicindustries.com/img/logo.avif',
  image: 'https://autologicindustries.com/img/logo.avif',
  description:
    'Leading manufacturer and exporter of two wheeler and three-wheeler auto parts, clutch plates, pressure plates, clutch kits, and aluminium die-casting components.',
  telephone: '+91-9999985012',
  email: 'info@autologicindustries.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Kh 52/13, Prahlad Pur, Industrial Area, Bawana Road',
    addressLocality: 'Delhi',
    postalCode: '110042',
    addressCountry: 'IN',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+91-9999985012',
      contactType: 'sales',
      areaServed: ['IN', 'AE', 'US', 'Global'],
      availableLanguage: ['English', 'Hindi'],
    },
    {
      '@type': 'ContactPoint',
      telephone: '+91-9911154216',
      contactType: 'customer service',
      areaServed: ['IN', 'AE', 'Global'],
      availableLanguage: ['English', 'Hindi'],
    },
  ],
  sameAs: [
    'https://www.facebook.com/autologicindustries',
    'https://www.instagram.com/autologicindustries',
    'https://www.linkedin.com/company/autologicindustries',
    'https://www.youtube.com/@autologicindustries',
  ],
};

const NO_PRODUCT_SCHEMA_PAGES = ['about-us.php', 'contact-us.php', 'location.php'];

/** Canonical URL exactly as header.php derived it: explicit $canonical, else origin + request path. */
export function canonicalFor(vars: PageVars, requestPath: string): string {
  return vars.canonical ?? SITE_ORIGIN + requestPath;
}

/** The JSON-LD blocks header.php prints in the <head>, in the same order. */
export function headSchemas(vars: PageVars, requestPath: string): JsonObject[] {
  const canonical = canonicalFor(vars, requestPath);
  const pageFile = requestPath.split('/').pop() ?? '';
  const isHome = pageFile === '' || pageFile === 'index.php';
  const crumbTitle = vars.title !== undefined ? phpTrim(vars.title.split('|')[0]) : 'Page';

  const breadcrumb: JsonObject =
    vars.breadcrumbSchema ??
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://autologicindustries.com/' },
        ...(isHome ? [] : [{ '@type': 'ListItem', position: 2, name: crumbTitle, item: canonical }]),
      ],
    };

  let product = vars.productSchema;
  // PHP: if (!isset($product_schema) && !$is_home && !in_array($page_file, [...]))
  if ((product === undefined || product === null) && !isHome && !NO_PRODUCT_SCHEMA_PAGES.includes(pageFile)) {
    product = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: vars.title !== undefined ? phpTrim(vars.title.split('|')[0]) : 'Automotive Component',
      image: 'https://autologicindustries.com/img/logo.avif',
      description: vars.description !== undefined ? phpTrim(vars.description) : 'High quality automotive precision parts manufactured by Autologic Industries.',
      brand: { '@type': 'Brand', name: 'Autologic Industries' },
      manufacturer: { '@type': 'Organization', name: 'Autologic Industries', url: 'https://autologicindustries.com/' },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        url: canonical,
      },
    };
  }

  const out: JsonObject[] = [WEBSITE_SCHEMA, ORG_SCHEMA, breadcrumb];
  if (product && typeof product === 'object') out.push(product);
  if (vars.faqSchema && typeof vars.faqSchema === 'object') out.push(vars.faqSchema);
  return out;
}
