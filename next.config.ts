import type { NextConfig } from 'next';
import marketData from './content/market/data.json';
import stubRedirects from './content/redirects.json';

/**
 * URL behaviour of the PHP site (.htaccess rules + 301 stub files), kept so every existing URL
 * resolves exactly as before. Redirects use 301 like the original, not Next's default 308.
 */

type Redirect = { source: string; destination: string; statusCode: 301; has?: { type: 'host'; value: string }[] };

const MARKETS = Object.keys(marketData.markets).join('|');
const OLD_MARKETS =
  'abudhabi|argentina|bahrain|brazil|bulgaria|chile|delhincr|dubai|france|germany|gujarat|italy|karnataka|kuwait|latinaamerica|maharashtra|oman|peru|poland|qatar|romania|saudiarabia|spain|tamilnadu';

// Old market folder slugs that were mapped to a different root page (.htaccess, removed 2026-11-02)
const OLD_MARKET_SLUG_MAP: Record<string, string> = {
  '2-wheeler-3-wheeler-clutch-and-pressure-plate': '2-wheeler-inner-clutch-assembly',
  '2-wheeler-3-wheeler-clutch-kit': '2-wheeler-clutch-hub',
  '2-wheeler-auto-parts': '2-wheeler-clutch-outer-housing',
  '3-wheeler-clutch-and-pressure-plate': '3-wheeler-inner-clutch-assembly',
  '3-wheeler-clutch-braking-parts': '3-wheeler-drum-brake-shoes',
  '3-wheeler-clutch-kit': '3-wheeler-clutch-hub',
  '3-wheeler-spare-parts': '3-wheeler-clutch-housing',
  'aluminium-die-casting': 'die-cast-clutch-housing-outer',
  'automative-2-and-3-clutch-braking-parts': '2-wheeler-clutch-plate',
  'automotive-parts-and-components': 'high-volume-production-castings',
  'engineering-focused-great-for-die-casting-export': 'cnc-machined-engine-components',
  'engine-parts-for-3-wheeler': '3-wheeler-engine-parts',
};

/** Matches "/x" and "/x.php", like the (?:\.php)? groups in .htaccess. */
function withAndWithoutPhp(source: string, destination: string): Redirect[] {
  return [
    { source: `${source}.php`, destination, statusCode: 301 },
    { source, destination, statusCode: 301 },
  ];
}

function htaccessRedirects(): Redirect[] {
  return [
    // WWW -> non-WWW (HTTPS itself is enforced by the hosting platform / proxy)
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.autologicindustries.com' }],
      destination: 'https://autologicindustries.com/:path*',
      statusCode: 301,
    },
    // Point 16: only one Home, About Us and Contact Us page
    ...withAndWithoutPhp(`/:market(${MARKETS})/about-us`, '/about-us.php'),
    ...withAndWithoutPhp(`/:market(${MARKETS})/contact-us`, '/contact-us.php'),
    ...withAndWithoutPhp(`/:market(${MARKETS})/index`, '/'),
    { source: `/:market(${MARKETS})`, destination: '/', statusCode: 301 },
    // Old market folders (removed 2026-11-02): 301 to the root page
    { source: `/:old(${OLD_MARKETS})`, destination: '/', statusCode: 301 },
    ...withAndWithoutPhp(`/:old(${OLD_MARKETS})/:file(index|header|footer)`, '/'),
    ...Object.entries(OLD_MARKET_SLUG_MAP).flatMap(([from, to]) => withAndWithoutPhp(`/:old(${OLD_MARKETS})/${from}`, `/${to}.php`)),
    { source: `/:old(${OLD_MARKETS})/:file([^/]+?).php`, destination: '/:file.php', statusCode: 301 },
    { source: `/:old(${OLD_MARKETS})/:file([^/.]+)`, destination: '/:file.php', statusCode: 301 },
    // Misspelled slug removed (automative -> 2W clutch plate page)
    ...withAndWithoutPhp('/automative-2-and-3-clutch-braking-parts', '/2-wheeler-clutch-plate.php'),
    ...withAndWithoutPhp(`/:market(${MARKETS})/automative-2-and-3-clutch-braking-parts`, '/:market/2-wheeler-clutch-plate.php'),
  ];
}

/** The 301 stub files (root and market folders), also reachable without ".php" via the clean-URL rule. */
function stubFileRedirects(): Redirect[] {
  return stubRedirects.flatMap(({ source, destination }) =>
    withAndWithoutPhp(source.replace(/\.php$/, ''), destination),
  );
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    agentUpgrade: 'security',
  },
  // Page content is read from these folders at request time; include them in server bundles.
  outputFileTracingIncludes: { '/**': ['./content/**', './templates/**'] },
  async redirects() {
    return [...htaccessRedirects(), ...stubFileRedirects()];
  },
  async rewrites() {
    // Form endpoints keep their original URLs.
    return [
      { source: '/send-mail.php', destination: '/api/send-mail' },
      { source: '/form-handler.php', destination: '/api/form-handler' },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/:path*.:ext(jpg|jpeg|png|gif|webp|avif)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' }],
      },
      {
        source: '/:path*.:ext(svg|ico|mp4)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }],
      },
    ];
  },
};

export default nextConfig;
