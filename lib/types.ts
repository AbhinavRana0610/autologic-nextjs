export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

/** Variables a page sets before including header.php. */
export interface PageVars {
  title?: string;
  description?: string;
  keyword?: string;
  canonical?: string;
  /** `false` suppresses the default Product schema (market listing pages). */
  productSchema?: JsonObject | false | null;
  faqSchema?: JsonObject | null;
  breadcrumbSchema?: JsonObject;
  isHomepage?: boolean;
}

/** Link prefixes header.php / footer.php used: "" for root pages, "../" + market folder for market pages. */
export interface ChromeOptions {
  base: string;
  prodBase: string;
  marketProductsUrl?: string;
  isHomepage?: boolean;
  /** Footer product links: on market pages section-only items point at their host page section. */
  footerProductHref?: (slug: string) => string;
}

/** Everything needed to render one page: head data, JSON-LD blocks and the body markup. */
export interface RenderedPage {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  /** JSON-LD blocks header.php printed in the <head>. */
  schemas: JsonObject[];
  /** Body markup: site chrome + page content, exactly as the PHP site output it. */
  html: string;
}
