import type { MarketListingContent } from './market';
import { marketData, marketHref } from './market';
import { esc, phpJson } from './php-compat';
import type { JsonObject } from './types';

/**
 * Body of <market>/products.php: port of includes/market-listing.php and market-breadcrumb.php.
 * Markup, class names, inline styles and even whitespace match the PHP output. Values marked
 * "raw" were printed without escaping in PHP because the content files contain HTML there.
 *
 * Whitespace note: in the PHP template every `<?php foreach ?>` / `<?php endforeach ?>` sits on its
 * own line indented by one space, and PHP drops the newline after `?>`. `loop()` reproduces that:
 * one space before the first item, and each item ends with the endforeach line's leading space.
 */
function loop<T>(items: T[], body: (item: T, index: number) => string): string {
  return ' ' + items.map(body).join('');
}

const MARKET_PAGE_SCRIPTS = `<script>
document.addEventListener('DOMContentLoaded', function() {
 // Accordion Interaction
 var questions = document.querySelectorAll('.faq-question');
 questions.forEach(function(btn) {
 btn.addEventListener('click', function() {
 var item = btn.closest('.faq-item');
 var isOpen = item.classList.contains('open');
 document.querySelectorAll('.faq-item').forEach(function(el) {
 el.classList.remove('open');
 });
 if (!isOpen) {
 item.classList.add('open');
 }
 });
 });

 // Reveal Intersection Observer
 var reveals = document.querySelectorAll('.reveal-fade,.reveal-scale');
 if ('IntersectionObserver' in window) {
 var observer = new IntersectionObserver(function(entries) {
 entries.forEach(function(entry) {
 if (entry.isIntersecting) {
 entry.target.classList.add('in-view');
 }
 });
 }, { threshold: 0.1 });
 reveals.forEach(function(el) { observer.observe(el); });
 } else {
 reveals.forEach(function(el) { el.classList.add('in-view'); });
 }
});
</script>`;

/** Visible breadcrumb built from the page's BreadcrumbList schema (market-breadcrumb.php). */
function breadcrumbNav(breadcrumb: JsonObject, base: string): string {
  const { siteUrl } = marketData();
  const items = breadcrumb.itemListElement as { name: string; item: string }[];
  return ` <nav class="market-breadcrumb" aria-label="Breadcrumb" style="margin-bottom:14px; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.75);">
${loop(items, (item, i) => {
  if (i === items.length - 1) {
    return `  <span aria-current="page" style="color:#fff; font-weight:600;">${esc(item.name)}</span>\n  `;
  }
  const path = item.item.slice(siteUrl.length);
  const href = base + (path === '' ? 'index.php' : path);
  return `  <a href="${esc(href)}" style="color:rgba(255,255,255,0.75); text-decoration:none;" title="${esc(item.name)}">${esc(item.name)}</a>
 <span aria-hidden="true" style="margin:0 6px;">/</span>\n  `;
})} </nav>
`;
}

export function renderMarketListingBody(market: string, c: MarketListingContent, breadcrumb: JsonObject, itemList: JsonObject): string {
  const data = marketData();
  const name = esc(data.markets[market].name);
  const img = '../img/products_hd/';
  const products = Object.entries(data.products);

  const categories = loop(Object.entries(data.categories), ([cat, info], ci) => {
    const sec = c.categories[cat];
    const cards = products.filter(([, p]) => p.cat === cat && !p.no_card);
    return ` <section class="showcase" id="${ci === 0 ? 'catalogue' : `catalogue-${cat}`}">
 <div class="container">
 <div class="showcase-header">
 <div class="section-tag reveal-fade"><span><i class="fas ${info.icon}"></i> ${esc(info.title)}</span></div>
 <h2 class="section-title reveal-split">${esc(sec.title[0])} <em>${esc(sec.title[1])}</em></h2>
 <p style="color:var(--mid); font-size:15px; line-height:1.7; margin:0;">${sec.intro /* raw */}</p>
 </div>
 <div class="product-grid-row">
${loop(cards, ([slug, p]) => {
  const cardName = p.card_name ?? p.name;
  return ` <a class="product-card-hud reveal-fade" href="${esc(marketHref(slug))}" title="${esc(cardName)} for ${name}" style="text-decoration:none; color:inherit;">
 <div class="card-img-wrap">
 <span class="product-hud-tag">${esc(p.card_name !== undefined ? cardName : p.label)}</span>
 <img src="${img}${esc(p.hero)}" alt="${esc(cardName)} for ${name} buyers" class="card-img" loading="lazy" title="${esc(cardName)} for ${name} buyers" />
 </div>
 <h3 class="card-title">${esc(cardName)}</h3>
 <p class="card-desc">${esc(c.cards[slug])}</p>
 <span class="card-desc" style="color:var(--accent); font-weight:600;">View Product &rarr;</span>
 </a>
 `;
})} </div>
 </div>
 </section>
 `;
  });

  return `<script type="application/ld+json">
${phpJson(itemList)}
</script>

<main>

 <!-- 1. Top Page Banner (.page-banner) -->
 <section class="page-banner" id="page-banner">
 <img src="${img}banner_automotive_parts_components.avif${data.imgBb}" alt="Automotive parts and components for ${name}" class="page-banner-img" title="${name} Products" />
 <div class="page-banner-overlay">
 <div class="container">
 <div class="page-banner-content">
 ${breadcrumbNav(breadcrumb, '../')} <span class="page-banner-tag">Autologic Precision Engineering</span>
 <div class="page-banner-title">${name} Products</div>
 <p class="page-banner-desc">${esc(c.banner_desc)}</p>
 </div>
 </div>
 </div>
 </section>

 <!-- 2. Products Hero (.products-hero) -->
 <section class="products-hero" id="products-hero">
 <div class="products-hero-content container">
 <div class="products-hero-text product-hero-detail">
 <div class="product-hero-badge reveal-fade">
 <span>OEM Certified Manufacturing</span>
 </div>
 <h1 class="products-hero-title reveal-split">${esc(c.h1[0])} <em>${esc(c.h1[1])}</em></h1>
 <p class="products-hero-sub reveal-fade">${esc(c.hero_sub)}</p>
 <div class="products-hero-desc reveal-fade">
${loop(c.hero, (p, i) => ` <p${i ? ' style="margin-top:12px;"' : ''}>${p /* raw */}</p>\n `)} </div>
 <div class="hero-btns reveal-fade">
 <a href="#catalogue" class="btn btn-dark magnetic" title="Product Catalogue">
 <span>Explore Products</span>
 <svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>
 </a>
 <a href="#" onclick="openEmailModal();return false;" class="btn btn-outline magnetic" title="Request Bulk Quote">
 <i class="fas fa-envelope-open-text"></i> <span>Request Bulk Quote</span>
 </a>
 <a href="#" onclick="openWhatsAppModal();return false;" class="btn btn-outline btn-whatsapp magnetic" title="WhatsApp">
 <i class="fab fa-whatsapp"></i> <span>WhatsApp</span>
 </a>
 </div>
 </div>
 <div class="hero-machine-frame hero-fit reveal-scale">
 <img src="${img}2w_clutch_assembly.avif${data.imgNc}" alt="${esc(c.hero_alt)}" class="hero-machine-img" title="${name} Products" loading="lazy" />
 </div>
 </div>
 </section>

 <!-- 3. Product catalogue by category (.showcase) -->
${categories}
 <!-- 4. Sourcing & logistics (.network-section #reach) -->
 <section class="network-section" id="reach">
 <div class="container">
 <div class="network-grid">
${loop(c.network, (card, i) => ` <div class="network-card reveal-scale">
 <div class="section-tag reveal-fade"><span>${i ? 'Export Logistics' : 'Why Autologic'}</span></div>
 <h2 class="network-title reveal-split">${esc(card.title)}</h2>
 <div class="network-body reveal-fade">
${loop(card.paras, (p) => ` <p class="network-text">${p /* raw */}</p>\n `)} <ul class="network-list">
${loop(card.list, (li) => ` <li><i class="fas fa-check-circle"></i> <span>${esc(li)}</span></li>\n `)} </ul>
 </div>
 </div>
 `)} </div>
 </div>
 </section>

 <!-- 5. Custom RFQ Call to Action (.cta-section #cta) -->
 <section class="cta-section" id="cta">
 <div class="container">
 <div class="cta-banner-card reveal-scale">
 <div class="cta-card-content">
 <h2 class="cta-card-title">${esc(c.cta.title.toUpperCase())}</h2>
 <p class="cta-card-subtitle">${c.cta.text /* raw */}</p>
 <div class="cta-actions-wrap">
 <a href="#" onclick="openEmailModal();return false;" class="cta-card-btn magnetic" title="Request Bulk Quote"><span>Request Bulk Quote</span></a>
 <a href="#" onclick="openCallModal();return false;" class="cta-card-btn cta-btn-secondary magnetic" title="Call Sales"><span>Call Sales</span></a>
 <a href="#" onclick="openWhatsAppModal();return false;" class="cta-card-btn cta-btn-wa magnetic" title="WhatsApp"><i class="fab fa-whatsapp"></i> <span>WhatsApp Enquiries</span></a>
 </div>
 </div>
 </div>
 </div>
 </section>

 <!-- 6. Frequently Asked Questions (.faq section #faq) -->
 <section class="faq section" id="faq">
 <div class="container">
 <div class="faq-grid">
 <div class="faq-left">
 <div class="section-tag reveal-fade"><span>Got Questions?</span></div>
 <h2 class="section-title reveal-split">Frequently Asked <em>Questions</em></h2>
 <p style="margin-top:14px; color:var(--mid); font-size:15px; line-height:1.7;">${esc(c.faq_intro)}</p>
 </div>
 <div class="faq-right">
${loop(c.faqs, ([q, a], i) => ` <div class="faq-item reveal-fade${i ? '' : ' open'}">
 <button class="faq-question">
 <span>${esc(q)}</span>
 <div class="faq-icon"><span></span><span></span></div>
 </button>
 <div class="faq-answer">
 <p>${a /* raw */}</p>
 </div>
 </div>
 `)} </div>
 </div>
 </div>
 </section>

</main>

${MARKET_PAGE_SCRIPTS}

`;
}
