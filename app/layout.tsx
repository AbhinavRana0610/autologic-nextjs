import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

/**
 * Document shell = the <head> of header.php. Stylesheets and scripts keep their original order
 * and loading behaviour (GSAP/ScrollTrigger load synchronously before the page scripts that use
 * them), so the cascade and script timing match the PHP site. Per-page title, description,
 * keywords and canonical come from each page's generateMetadata().
 */

export const metadata: Metadata = {
  metadataBase: new URL('https://autologicindustries.com'),
  verification: { google: 'M8hZeVZw7U79W0Kl4-dNvHr3srkvy0X3KgyYMo5LARw' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1.0 };

const GTAG = `
 window.dataLayer = window.dataLayer || [];
 function gtag(){dataLayer.push(arguments);}
 gtag('js', new Date());

 gtag('config', 'G-BTD4TV5J09');
`;

// The original page loads ionicons with a misspelt "typekey" attribute; kept as-is.
const ionicons = { typekey: 'module' } as Record<string, string>;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/products.css?v=20261028_fix_pill_wrap" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" type="image/png" href="/img/favicon.png" />
        <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-LN+7fdVzj6u52u30Kp6M/trliBMCMKTyK833zpbD+pXdCLuTusPj697FH4R/5mcr"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
        {/* Mobile/tablet fixes; loaded last among the stylesheets. */}
        <link rel="stylesheet" href="/css/responsive.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.3/gsap.min.js"></script>
        <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
        <script {...ionicons} src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js"></script>
        <script noModule src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"></script>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-BTD4TV5J09"></script>
        <script dangerouslySetInnerHTML={{ __html: GTAG }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
