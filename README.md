# Autologic Industries: Next.js version

This folder is a Next.js 16 (App Router, TypeScript) version of the PHP site one folder up.
It renders the same pages at the same URLs, with the same markup, styles, scripts and SEO data.
The PHP site has not been changed.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

Copy `.env.example` to `.env.local` and set the SMTP settings so the forms can send mail (see below).

## How it is built

| PHP | Next.js |
| --- | --- |
| `header.php` `<head>` | `app/layout.tsx`. Same stylesheets and scripts in the same order. Title, description, keywords and canonical come from `generateMetadata`. |
| `header.php` body part / `footer.php` | `templates/header.html` and `templates/footer.html`, rendered by `lib/chrome.ts`. The `%%TOKENS%%` sit where the PHP variables were printed. |
| Schema block in `header.php` | `lib/schema.ts` (WebSite, Organization, Breadcrumb, default Product, FAQ) |
| `index.php` and other root pages | `app/page.tsx`, `app/[slug]/page.tsx`. Content is in `content/pages/<slug>.html` (body) and `<slug>.json` (title, schemas…). |
| `<market>/<product>.php` + `includes/market-root.php` | `app/[slug]/[page]/page.tsx` and `lib/market.ts`. The root page is rendered and its `<p>` text, H1 and links are swapped for the market text (`content/market/<market>/<page>.json`). |
| `<market>/products.php` + `includes/market-listing.php` | `lib/market-listing.ts` |
| `send-mail.php`, `form-handler.php` | `app/api/send-mail/route.ts` and `app/api/form-handler/route.ts`. They are still served at `/send-mail.php` and `/form-handler.php` through rewrites. |
| `.htaccess` rules + 301 stub files | `redirects()` / `headers()` in `next.config.ts`. The stub list is in `content/redirects.json`. |
| `img/`, `video/`, `css/`, `robots.txt`, `sitemap.xml` | `public/`, copied by `npm run sync-assets` |

Page bodies are injected as HTML on purpose. The original pages carry their own inline
`<style>`/`<script>` blocks and `onclick="openEmailModal()"` handlers. The market pages are made by
editing the root page's HTML by paragraph index. Keeping that markup as HTML is what makes the
output byte-identical to the PHP site. Internal links stay plain `<a href>`, so every navigation is
a full page load, just like before, and every page script runs exactly as it did on PHP.

## Editing content

- **Root page text/markup:** edit `content/pages/<slug>.html`. Title, description, keywords and schemas are in `<slug>.json`.
- **Market page text:** edit `content/market/<market>/<page>.json` (`p` = replacement paragraphs keyed by `<p>` index in the root page; `h1_kw`, `title`, `description`, `keyword`).
- **Products / markets list:** `content/market/data.json`.
- **Header / footer / modals:** `templates/header.html`, `templates/footer.html`.
- **New redirect:** add to `content/redirects.json` (or `next.config.ts` for pattern rules).

Note: `scripts/export-php-content.php` re-exports all content from the PHP site. Run it only while
the PHP site is still the source of truth. It **overwrites** edits made under `content/` and `templates/`.

## Mail

PHP used `mail()`. The routes use nodemailer:

- `SMTP_HOST` set → sends through that SMTP server (needed on Vercel and similar hosts).
- No SMTP and Linux/macOS → uses the local `sendmail` binary, the same thing `mail()` used.
- localhost with nothing configured → `/send-mail.php` writes to `mail_log.txt` and answers `success`, like the PHP version.

## Known differences from the PHP site

- `/<market>/index.php` redirects to `/`. That is the production `.htaccess` behaviour; on localhost the PHP stub sent it to `/index.php`.
- HTTP→HTTPS is left to the host/proxy. The www → non-www redirect is in `next.config.ts`.
- `form-handler.php` rate-limited per PHP session. The port limits per client IP, kept in memory per server process. No live page uses this endpoint (only the old market `header.php` files did).
- Unknown URLs show Next.js's default 404 page instead of Apache's.
- Next.js adds its hydration payload to each page, so raw HTML is about 2× bigger (gzip: ~82 KB for the home page).
- Not migrated because they are not pages: `index_backup.php`, the legacy `<market>/header.php` / `footer.php` partials, and `scratch/`.
