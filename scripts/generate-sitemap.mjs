/**
 * توليد خرائط الموقع (Sitemaps) مقسّمة (Sharded):
 *   public/sitemap.xml            → فهرس الخرائط (Sitemap Index)
 *   public/sitemaps/pages.xml     → الصفحات الثابتة
 *   public/sitemaps/surahs.xml    → صفحات السور (2..114؛ الفاتحة هي الصفحة الرئيسية)
 *   public/sitemaps/ayahs-N.xml   → صفحات الآيات مقسّمة على شاردات
 *
 * يعمل تلقائيًا قبل كل عملية بناء (prebuild).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://quran.com.ly';
const SITEMAPS_DIR = path.join(ROOT, 'public', 'sitemaps');
const SURAHS_FILE = path.join(ROOT, 'public', 'assets', 'data', 'surahs.json');

const today = new Date().toISOString().slice(0, 10);

const surahs = JSON.parse(fs.readFileSync(SURAHS_FILE, 'utf-8'));
if (!Array.isArray(surahs) || surahs.length !== 114) {
  throw new Error(`surahs.json غير صالح: ${surahs?.length} سورة`);
}

fs.mkdirSync(SITEMAPS_DIR, { recursive: true });

function urlEntry(loc, { changefreq = 'weekly', priority = '0.6' } = {}) {
  return `  <url>
    <loc>${SITE}${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function writeSitemap(fileName, entries) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(SITEMAPS_DIR, fileName), xml, 'utf-8');
  return entries.length;
}

const shardFiles = [];
const shardSize = 20; // عدد السور في كل شارد آيات
const ayahShards = [];
for (let start = 1; start <= 114; start += shardSize) {
  const end = Math.min(start + shardSize - 1, 114);
  ayahShards.push({ start, end });
}

let pagesCount = 0;
let surahsCount = 0;
let enSurahsCount = 0;
let ayahsCount = 0;

// 1) الصفحات الثابتة (عربي + إنجليزي)
pagesCount = writeSitemap('pages.xml', [
  urlEntry('/', { changefreq: 'daily', priority: '1.0' }),
  urlEntry('/about', { changefreq: 'monthly', priority: '0.5' }),
  urlEntry('/sources', { changefreq: 'monthly', priority: '0.5' }),
  urlEntry('/contact', { changefreq: 'yearly', priority: '0.4' }),
  urlEntry('/data', { changefreq: 'monthly', priority: '0.6' }),
  urlEntry('/api', { changefreq: 'monthly', priority: '0.5' }),
  urlEntry('/en', { changefreq: 'daily', priority: '1.0' }),
  urlEntry('/en/about', { changefreq: 'monthly', priority: '0.5' }),
  urlEntry('/en/sources', { changefreq: 'monthly', priority: '0.5' }),
  urlEntry('/en/contact', { changefreq: 'yearly', priority: '0.4' }),
  urlEntry('/en/data', { changefreq: 'monthly', priority: '0.6' }),
  urlEntry('/en/api', { changefreq: 'monthly', priority: '0.5' }),
]);

// 2) صفحات السور (عربي)
surahsCount = writeSitemap(
  'surahs.xml',
  surahs
    .filter((surah) => surah.id !== 1)
    .map((surah) =>
      urlEntry(`/surah/${surah.id}`, {
        changefreq: 'monthly',
        priority: surah.id <= 10 ? '0.9' : '0.8',
      })
    )
);

// 2.5) صفحات السور (إنجليزي)
enSurahsCount = writeSitemap(
  'en-surahs.xml',
  surahs
    .filter((surah) => surah.id !== 1)
    .map((surah) =>
      urlEntry(`/en/surah/${surah.id}`, {
        changefreq: 'monthly',
        priority: surah.id <= 10 ? '0.8' : '0.7',
      })
    )
);

// 3) صفحات الآيات (شاردات)
ayahShards.forEach((shard, index) => {
  const entries = [];
  for (let surahId = shard.start; surahId <= shard.end; surahId++) {
    const surah = surahs.find((item) => item.id === surahId);
    if (!surah) continue;
    for (let aya = 1; aya <= surah.total_verses; aya++) {
      entries.push(
        urlEntry(`/surah/${surahId}/${aya}`, {
          changefreq: 'yearly',
          priority: '0.5',
        })
      );
    }
  }
  const fileName = `ayahs-${index + 1}.xml`;
  const written = writeSitemap(fileName, entries);
  ayahsCount += written;
  shardFiles.push({ fileName, start: shard.start, end: shard.end, count: written });
});

// 4) فهرس الخرائط
const indexEntries = [
  `  <sitemap>
    <loc>${SITE}/sitemaps/pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`,
  `  <sitemap>
    <loc>${SITE}/sitemaps/surahs.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`,
  `  <sitemap>
    <loc>${SITE}/sitemaps/en-surahs.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`,
  ...shardFiles.map(
    (shard) => `  <sitemap>
    <loc>${SITE}/sitemaps/${shard.fileName}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`
  ),
];

const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries.join('\n')}
</sitemapindex>
`;
fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), indexXml, 'utf-8');

console.log('✓ تم توليد خرائط الموقع:');
console.log(`  - pages.xml: ${pagesCount} رابطًا`);
console.log(`  - surahs.xml: ${surahsCount} رابطًا`);
console.log(`  - en-surahs.xml: ${enSurahsCount} رابطًا`);
for (const shard of shardFiles) {
  console.log(`  - ${shard.fileName}: ${shard.count} رابطًا (سور ${shard.start}-${shard.end})`);
}
console.log(`  - إجمالي صفحات الآيات: ${ayahsCount} (المتوقع 6236)`);
console.log(`  - sitemap.xml: فهرس ${indexEntries.length} خرائط`);
