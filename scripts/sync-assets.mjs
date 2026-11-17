// Copies the original site's static assets into public/ so URLs stay identical
// (/img/..., /video/..., /css/..., /robots.txt, /sitemap.xml).
// Only files that are new or changed (size/mtime) are copied. Usage: npm run sync-assets [path-to-php-site]
import { cpSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(process.argv[2] ?? join(root, '..'));
const entries = ['img', 'video', 'css', 'robots.txt', 'sitemap.xml'];

let copied = 0;
for (const entry of entries) {
  const from = join(site, entry);
  if (!existsSync(from)) {
    console.warn(`missing: ${from}`);
    continue;
  }
  cpSync(from, join(root, 'public', entry), {
    recursive: true,
    preserveTimestamps: true,
    filter: (src) => {
      const dest = join(root, 'public', src.slice(site.length));
      const s = statSync(src);
      if (s.isDirectory()) return true;
      if (existsSync(dest)) {
        const d = statSync(dest);
        if (d.size === s.size && d.mtimeMs >= s.mtimeMs) return false;
      }
      copied++;
      return true;
    },
  });
}
console.log(`assets synced from ${site} (${copied} file(s) copied)`);
