import { esc } from './php-compat';
import { templateFile } from './site';
import type { ChromeOptions } from './types';

/**
 * Site chrome (splash screen, header/nav, floating buttons, enquiry modals, footer) from
 * templates/header.html and templates/footer.html. The %%TOKENS%% stand where header.php and
 * footer.php printed PHP variables; everything else is the original markup, styles and scripts.
 */

export function renderHeader(o: ChromeOptions): string {
  return templateFile('header.html')
    .replaceAll('%%BASE%%', o.base)
    .replaceAll('%%PROD_BASE%%', o.prodBase)
    .replaceAll('%%MARKET_PRODUCTS_URL%%', o.marketProductsUrl !== undefined ? esc(o.marketProductsUrl) : '#')
    .replaceAll('%%IS_HOMEPAGE%%', o.isHomepage ? 'true' : 'false');
}

export function renderFooter(o: ChromeOptions): string {
  const productHref = o.footerProductHref ?? ((slug: string) => `${o.prodBase}${slug}.php`);
  return templateFile('footer.html')
    .replace(/%%FOOTER_PROD:([^%]+)%%/g, (_m, slug: string) => productHref(slug))
    .replaceAll('%%BASE%%', o.base)
    .replaceAll('%%PROD_BASE%%', o.prodBase);
}
