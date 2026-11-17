<?php
/**
 * One-shot exporter: reads the original PHP site (one folder up) and writes the data the
 * Next.js app renders from. Nothing in the PHP site is modified.
 *
 *   php scripts/export-php-content.php [path-to-php-site]
 *
 * Output (relative to the Next.js project):
 *   content/pages/<slug>.html    page body exactly as written between header and footer includes
 *   content/pages/<slug>.json    SEO variables set at the top of the page (title, schemas, ...)
 *   content/market/data.json     markets, products, categories and URL constants
 *   content/market/<mk>/<page>.json  per-market content arrays
 *   content/redirects.json       every 301 stub file (root + market folders)
 *   templates/header.html, templates/footer.html  site chrome with %%TOKENS%% for the PHP variables
 */

error_reporting(E_ALL);
$site = rtrim($argv[1] ?? dirname(__DIR__, 2), '/\\');
$out = dirname(__DIR__);
if (!is_file("$site/header.php")) {
    fwrite(STDERR, "PHP site not found at $site\n");
    exit(1);
}

function write_file(string $path, string $data): void
{
    if (!is_dir(dirname($path))) {
        mkdir(dirname($path), 0777, true);
    }
    file_put_contents($path, $data);
}
function write_json(string $path, $value): void
{
    write_file($path, json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n");
}
function strip_bom(string $s): string
{
    return strncmp($s, "\xEF\xBB\xBF", 3) === 0 ? substr($s, 3) : $s;
}
/** Runs a PHP snippet (the variable block at the top of a page) and returns the variables it defines. */
function eval_prelude(string $php): array
{
    $tmp = tempnam(sys_get_temp_dir(), 'pre');
    file_put_contents($tmp, $php);
    $vars = (function () use ($tmp) {
        include $tmp;
        unset($tmp);
        return get_defined_vars();
    })();
    unlink($tmp);
    return $vars;
}

$skip = ['header.php', 'footer.php', 'index_backup.php', 'form-handler.php', 'send-mail.php'];
$redirects = [];
$pages = [];

// ── Root pages and root redirect stubs ────────────────────────────────────────
foreach (glob("$site/*.php") as $file) {
    $name = basename($file);
    if (in_array($name, $skip, true)) continue;
    $src = file_get_contents($file);
    if (preg_match('#header\("Location:\s*([^"]+)"\)#', $src, $m)) {
        $redirects[] = ['source' => '/' . $name, 'destination' => '/' . ltrim($m[1], '/')];
        continue;
    }
    if (!preg_match("#^(.*?)include\('header\.php'\);?\s*\?>(.*)<\?php\s+include\('footer\.php'\);?\s*\?>#s", $src, $m)) {
        fwrite(STDERR, "skipped (no header/footer include): $name\n");
        continue;
    }
    $slug = substr($name, 0, -4);
    $vars = eval_prelude(strip_bom($m[1]));
    $meta = ['slug' => $slug];
    foreach (['page_title' => 'title', 'description' => 'description', 'keyword' => 'keyword', 'canonical' => 'canonical',
              'product_schema' => 'productSchema', 'faq_schema' => 'faqSchema', 'breadcrumb_schema' => 'breadcrumbSchema',
              'is_homepage' => 'isHomepage'] as $php => $js) {
        if (array_key_exists($php, $vars)) $meta[$js] = $vars[$php];
    }
    $unknown = array_diff(array_keys($vars), ['page_title', 'description', 'keyword', 'canonical', 'product_schema', 'faq_schema', 'breadcrumb_schema', 'is_homepage']);
    if ($unknown) fwrite(STDERR, "$name: unhandled variables " . implode(', ', $unknown) . "\n");
    write_json("$out/content/pages/$slug.json", $meta);
    write_file("$out/content/pages/$slug.html", $m[2]);
    $pages[] = $slug;
}

// ── Market data, content and market redirect stubs ────────────────────────────
require "$site/includes/market-data.php";
// Every .php file name in each market folder: market-root.php keeps a relative product link inside
// the market folder whenever a file of that name exists there (pages and redirect stubs alike).
$marketFiles = [];
foreach (array_keys($MARKETS) as $mk) {
    $marketFiles[$mk] = array_map('basename', glob("$site/$mk/*.php"));
}
write_json("$out/content/market/data.json", [
    'siteUrl' => SITE_URL,
    'imgNc' => IMG_NC,
    'imgBb' => IMG_BB,
    'markets' => $MARKETS,
    'products' => $MARKET_PRODUCTS,
    'categories' => $MARKET_CATEGORIES,
    'marketFiles' => $marketFiles,
]);

$marketPages = [];
foreach (array_keys($MARKETS) as $mk) {
    foreach (glob("$site/$mk/*.php") as $file) {
        $name = basename($file);
        if (in_array($name, ['header.php', 'footer.php'], true)) continue; // legacy partials, not pages
        $src = file_get_contents($file);
        if (preg_match('#header\("Location:\s*([^"]+)"\)#', $src, $m)) {
            $dest = $m[1];
            $dest = strncmp($dest, '../', 3) === 0 ? '/' . substr($dest, 3) : "/$mk/$dest";
            $redirects[] = ['source' => "/$mk/$name", 'destination' => $dest];
            continue;
        }
        $marketPages[] = "$mk/" . substr($name, 0, -4);
    }
    foreach (glob("$site/includes/market-content/$mk/*.php") as $file) {
        $c = require $file;
        write_json("$out/content/market/$mk/" . basename($file, '.php') . '.json', $c);
    }
}
sort($marketPages);
write_json("$out/content/market/pages.json", $marketPages);
usort($redirects, fn($a, $b) => strcmp($a['source'], $b['source']));
write_json("$out/content/redirects.json", $redirects);

// ── Header / footer templates ──────────────────────────────────────────────────
$header = file_get_contents("$site/header.php");
$pos = strpos($header, "<body>");
$header = substr($header, $pos + strlen("<body>"));
$header = str_replace(
    ['<?= $base ?>', '<?= $prod_base ?>', "<?= isset(\$market_products_url)? htmlspecialchars(\$market_products_url): '#' ?>",
     "<?php echo !empty(\$is_homepage)? 'true': 'false';?>"],
    ['%%BASE%%', '%%PROD_BASE%%', '%%MARKET_PRODUCTS_URL%%', '%%IS_HOMEPAGE%%'],
    $header
);
$footer = file_get_contents("$site/footer.php");
// The helper closure prints nothing; PHP also swallows the newline right after its closing tag.
$footer = preg_replace('#<\?php \$footer_prod = function.*?\}; \?>\r?\n?#s', '', $footer);
$footer = preg_replace("#<\?= \\\$footer_prod\('([^']+)'\) \?>#", '%%FOOTER_PROD:$1%%', $footer);
$footer = str_replace(['<?= $base ?>', '<?= $prod_base ?>'], ['%%BASE%%', '%%PROD_BASE%%'], $footer);
$footer = preg_replace('#</body>\s*$#', '', $footer);
foreach (['header' => $header, 'footer' => $footer] as $n => $tpl) {
    if (strpos($tpl, '<?') !== false) {
        fwrite(STDERR, "$n template still contains PHP\n");
        exit(1);
    }
    write_file("$out/templates/$n.html", $tpl);
}

printf("pages: %d, market pages: %d, redirects: %d\n", count($pages), count($marketPages), count($redirects));
