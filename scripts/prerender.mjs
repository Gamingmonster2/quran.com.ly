#!/usr/bin/env node
/**
 * ==========================================================================
 *  تصيير مسبق ثابت (Prerendering) — النقطة 15
 * ==========================================================================
 *  يعمل **بعد** `vite build` ويحوّل ناتج الـ SPA إلى صفحات HTML ثابتة
 *  قابلة للأرشفة والقراءة بدون JavaScript:
 *
 *   dist/surah/{1..114}.html  → صفحة ثابتة لكل سورة (عنوان/وصف/canonical/OG/JSON-LD
 *                               + نص السورة كاملًا داخل <div id="root">)
 *   dist/about.html           → عن الصفحات التعريفية
 *   dist/sources.html
 *   dist/contact.html
 *   dist/data.html
 *   dist/index.html           → نسخة الرئيسية المسبقة (سورة الفاتحة)
 *   dist/_redirects           → قواعد 200 صريحة قبل قاعدة fallback
 *
 *  الاستخدام:
 *      npm run build
 *      node scripts/prerender.mjs
 *
 *  يُفضَّل ربطه تلقائيًا بعد البناء عبر إضافة هذا السطر إلى package.json:
 *      "postbuild": "node scripts/prerender.mjs"
 *
 *  ملاحظات:
 *   - لا يعدّل السكربت أي ملف خارج dist/ ولا يمسّ src/ أو public/.
 *   - السكربت قابل لإعادة التشغيل (idempotent): ينظّف آثاره السابقة من
 *     dist/index.html قبل إعادة استخدامه كقالب.
 *   - المحتوى الثابت يظهر للزواحف والأرشفة، ويُزال تلقائيًا من الصفحة عند
 *     إقلاع تطبيق React (سكربت صغير مضمّن) حتى لا يتكرر المحتوى.
 * ==========================================================================
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const TEMPLATE_FILE = path.join(DIST, 'index.html');
const SURAH_DIR = path.join(DIST, 'surah');
const DATA_DIR = path.join(ROOT, 'public', 'assets', 'data');
const SURAHS_FILE = path.join(DATA_DIR, 'surahs.json');
const QURAN_BY_SURAH_FILE = path.join(DATA_DIR, 'quran-by-surah.json');

const SITE = 'https://quran.com.ly';
const TOTAL_SURAHS = 114;

/** كتابة نسخة مسبقة لصفحة الرئيسية أيضًا (نص الفاتحة داخل index.html). */
const PRERENDER_HOME = true;

/** وسم يُضاف على حاوية التطبيق في الـ HTML المسبق. */
const PRERENDER_MARKER = 'prerendered';

// ---------------------------------------------------------------------------
// أدوات مساعدة عامة
// ---------------------------------------------------------------------------

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** يحوّل الأرقام اللاتينية إلى أرقام عربية-هندية (شرقية). */
function toArabicDigits(value) {
  return String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}

/** يهرّب النص ليوضع بأمان داخل HTML (نص أو قيمة سمة). */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ملف البيانات غير موجود: ${path.relative(ROOT, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// التنسيق المضمّن للمحتوى الثابت (مشترك بين كل الصفحات)
// كل المحددات محصورة داخل .prerender-fallback حتى لا تتعارض مع تنسيقات التطبيق.
// ---------------------------------------------------------------------------

const FALLBACK_CSS = `
      html, body { margin: 0; padding: 0; }
      .prerender-fallback {
        box-sizing: border-box;
        min-height: 100vh;
        padding: 1.5rem 1rem 3rem;
        background: #fbf9f5;
        color: #1c1917;
        direction: rtl;
        text-align: right;
        font-family: "Segoe UI", "Noto Naskh Arabic", "Amiri", "Times New Roman", serif;
        font-size: 16px;
        line-height: 2;
      }
      .prerender-fallback *,
      .prerender-fallback *::before,
      .prerender-fallback *::after { box-sizing: border-box; }
      .prerender-fallback .prerender-inner { max-width: 48rem; margin: 0 auto; }
      .prerender-fallback header {
        margin: 0 0 1.5rem;
        padding: 1.25rem 1rem 1.5rem;
        border-bottom: 1px solid #e7e0d8;
        text-align: center;
      }
      .prerender-fallback .prerender-kicker {
        margin: 0 0 0.35rem;
        color: #78716c;
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .prerender-fallback h1 {
        margin: 0 0 0.6rem;
        color: #1c1917;
        font-size: 2rem;
        line-height: 1.4;
        font-weight: 700;
      }
      .prerender-fallback .prerender-meta {
        margin: 0;
        color: #57534e;
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 0.82rem;
      }
      .prerender-fallback .prerender-note {
        margin: 0 0 1.5rem;
        padding: 0.7rem 0.9rem;
        border: 1px dashed #d6cec2;
        border-radius: 0.6rem;
        background: #faf7f0;
        color: #78716c;
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 0.78rem;
        line-height: 1.7;
        text-align: center;
      }
      .prerender-fallback .prerender-bismillah {
        margin: 0 0 1.25rem;
        color: #44403c;
        font-size: 1.35rem;
        line-height: 2.2;
        text-align: center;
      }
      .prerender-fallback .prerender-verses { margin: 0; }
      .prerender-fallback .prerender-ayah {
        margin: 0 0 0.9rem;
        padding: 1rem 1.1rem 1.1rem;
        border: 1px solid #e7e0d8;
        border-radius: 0.75rem;
        background: #ffffff;
      }
      .prerender-fallback .prerender-ayah-text {
        margin: 0;
        color: #1c1917;
        font-size: 1.5rem;
        line-height: 2.4;
        text-align: justify;
        word-spacing: 0.05em;
      }
      .prerender-fallback .prerender-ayah-translation {
        margin: 0.55rem 0 0;
        padding-top: 0.5rem;
        border-top: 1px dashed #e7e0d8;
        color: #57534e;
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 0.86rem;
        line-height: 1.6;
        text-align: left;
      }
      .prerender-fallback .prerender-ayah-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.9rem;
        height: 1.9rem;
        margin-inline-start: 0.65rem;
        border: 1px solid #d6cec2;
        border-radius: 9999px;
        background: #faf7f0;
        color: #57534e;
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 0.75rem;
        line-height: 1;
        vertical-align: middle;
        direction: rtl;
      }
      .prerender-fallback h2 {
        margin: 1.75rem 0 0.75rem;
        color: #292524;
        font-size: 1.15rem;
        font-weight: 700;
      }
      .prerender-fallback p { margin: 0 0 0.9rem; }
      .prerender-fallback ul { margin: 0 0 1.25rem; padding: 0 1.25rem 0 0; }
      .prerender-fallback li { margin: 0 0 0.45rem; }
      .prerender-fallback .prerender-card {
        margin: 0 0 1.25rem;
        padding: 1.1rem 1.2rem;
        border: 1px solid #e7e0d8;
        border-radius: 0.75rem;
        background: #ffffff;
      }
      .prerender-fallback .prerender-code {
        display: block;
        margin: 0.35rem 0;
        padding: 0.45rem 0.6rem;
        border-radius: 0.45rem;
        background: #f5f1e8;
        color: #44403c;
        direction: ltr;
        text-align: left;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.78rem;
        word-break: break-all;
      }
      .prerender-fallback a { color: #047857; text-decoration: none; }
      .prerender-fallback a:hover { text-decoration: underline; }
      .prerender-fallback .prerender-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1.1rem;
        justify-content: center;
        margin-top: 2rem;
        padding-top: 1.25rem;
        border-top: 1px solid #e7e0d8;
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 0.85rem;
      }
      @media (max-width: 640px) {
        .prerender-fallback { padding: 1rem 0.75rem 2rem; font-size: 15px; }
        .prerender-fallback h1 { font-size: 1.6rem; }
        .prerender-fallback .prerender-ayah-text { font-size: 1.22rem; line-height: 2.2; }
        .prerender-fallback .prerender-ayah { padding: 0.85rem 0.9rem 0.95rem; }
      }
`;

/**
 * سكربت صغير يُضمَّن في نهاية body:
 * يراقب #root، وبمجرد أن يضيف React محتواه يُزيل النسخة الثابتة
 * حتى لا يتكرر المحتوى. إذا فشل تحميل التطبيق يبقى النص الثابت ظاهرًا.
 * (يعمل سواء أفرغ React الحاوية أولًا أو أضاف محتواه بعد المحتوى الثابت).
 */
const FALLBACK_SCRIPT = `
      (function () {
        try {
          var root = document.getElementById('root');
          if (!root) return;
          var fallback = root.querySelector('.prerender-fallback');
          if (!fallback) return;
          var cleanup = function () {
            var node = root.querySelector('.prerender-fallback');
            if (node && node.parentNode) node.parentNode.removeChild(node);
          };
          var hasAppContent = function () {
            for (var i = 0; i < root.children.length; i++) {
              if (!root.children[i].classList || !root.children[i].classList.contains('prerender-fallback')) {
                return true;
              }
            }
            return false;
          };
          var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
              if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0 && hasAppContent()) {
                cleanup();
                observer.disconnect();
                return;
              }
            }
          });
          observer.observe(root, { childList: true });
          window.addEventListener('load', function () {
            if (hasAppContent()) {
              cleanup();
              observer.disconnect();
            }
          });
        } catch (error) {
          /* في حال أي خطأ يبقى المحتوى الثابت ظاهرًا (بديل بدون JS) */
        }
      })();
`;

// ---------------------------------------------------------------------------
// التلاعب بقالب dist/index.html (الـ head) — كل الدوال نصية وآمنة التكرار
// ---------------------------------------------------------------------------

/** يزيل آثار تشغيل سابق للسكربت من القالب حتى يبقى قابلًا لإعادة الاستخدام. */
function stripPrerenderArtifacts(html) {
  let next = html.replace(/^\uFEFF?<!-- prerendered -->\r?\n/, '');
  next = next.replace(/\s*<style data-prerender-style>[\s\S]*?<\/style>/gi, '');
  next = next.replace(/\s*<link[^>]*data-prerender-style[^>]*>/gi, '');
  next = next.replace(/\s*<script[^>]*data-prerender-script[^>]*>\s*<\/script>/gi, '');
  next = next.replace(/\s*<script data-prerender-script>[\s\S]*?<\/script>/gi, '');
  next = next.replace(/\s*<script type="application\/ld\+json" id="page-structured-data">[\s\S]*?<\/script>/gi, '');
  // إعادة حاوية التطبيق فارغة كما أنشأها Vite
  next = next.replace(
    /<div\s+id="root"[^>]*>[\s\S]*<\/div>\s*<\/body>/i,
    '<div id="root"></div>\n  </body>'
  );
  return next;
}

function replaceTitle(html, title) {
  const nextTitle = `<title>${escapeHtml(title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, nextTitle);
  }
  return html.replace('</head>', `    ${nextTitle}\n  </head>`);
}

/** يحدّث <meta attribute="key" content="..."> مع الحفاظ على بقية السمات. */
function setMeta(html, attribute, key, content) {
  const escapedContent = escapeHtml(content);
  const tagPattern = new RegExp(
    `<meta\\b[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>`,
    'i'
  );
  const match = html.match(tagPattern);
  if (!match) {
    const tag = `<meta ${attribute}="${key}" content="${escapedContent}" />`;
    return html.replace('</head>', `    ${tag}\n  </head>`);
  }
  const updated = /\bcontent="[^"]*"/i.test(match[0])
    ? match[0].replace(/\bcontent="[^"]*"/i, `content="${escapedContent}"`)
    : match[0].replace(/\s*\/?>$/, ` content="${escapedContent}" />`);
  return html.replace(match[0], updated);
}

/** يحدّث <link rel="canonical" href="...">. */
function setCanonical(html, href) {
  const escapedHref = escapeHtml(href);
  const pattern = /<link\b[^>]*\brel="canonical"[^>]*>/i;
  const match = html.match(pattern);
  if (!match) {
    return html.replace(
      '</head>',
      `    <link rel="canonical" href="${escapedHref}" />\n  </head>`
    );
  }
  const updated = /\bhref="[^"]*"/i.test(match[0])
    ? match[0].replace(/\bhref="[^"]*"/i, `href="${escapedHref}"`)
    : match[0].replace(/\s*\/?>$/, ` href="${escapedHref}" />`);
  return html.replace(match[0], updated);
}

function setHtmlLang(html, lang = 'ar') {
  return html.replace(/<html\b([^>]*)>/i, (_match, attrs) => {
    const next = /\blang="[^"]*"/i.test(attrs)
      ? attrs.replace(/\blang="[^"]*"/i, `lang="${lang}"`)
      : `${attrs} lang="${lang}"`;
    return `<html${next}>`;
  });
}

function injectStructuredData(html, data, compact = false) {
  // JSON منسّق بمسافات حتى تكون الحقول بصيغة `"@type": "Chapter"` المقروءة
  // (يُصغَّر في صفحات الآيات لتقليل الحجم).
  const json = JSON.stringify(data, null, compact ? 0 : 2);
  const script = `    <script type="application/ld+json" id="page-structured-data">\n${json}\n    </script>`;
  return html.replace('</head>', `${script}\n  </head>`);
}

function injectFallbackStyle(html) {
  return html.replace(
    '</head>',
    `    <link rel="stylesheet" href="/prerender.css" data-prerender-style />\n  </head>`
  );
}

function injectFallbackScript(html) {
  return html.replace(
    '</body>',
    `    <script src="/prerender.js" data-prerender-script defer></script>\n  </body>`
  );
}

/** يكتب أصول معاينة المحتوى الثابت مرة واحدة بدل تكرارها في آلاف الصفحات. */
function writeFallbackAssets() {
  fs.writeFileSync(path.join(DIST, 'prerender.css'), FALLBACK_CSS, 'utf-8');
  fs.writeFileSync(path.join(DIST, 'prerender.js'), FALLBACK_SCRIPT, 'utf-8');
}

/** يضع المحتوى الثابت داخل حاوية التطبيق ويضيف وسم data-prerender. */
function injectRootContent(html, innerHtml, prerenderLabel) {
  const rootPattern = /<div\s+id="root"\s*>\s*<\/div>/i;
  if (!rootPattern.test(html)) {
    throw new Error(
      'لم يُعثر على <div id="root"></div> فارغة في dist/index.html — تأكد من تشغيل npm run build أولًا.'
    );
  }
  return html.replace(
    rootPattern,
    `<div id="root" data-prerender="${escapeHtml(prerenderLabel)}">\n${innerHtml}\n    </div>`
  );
}

/** يبني صفحة نهائية من قالب SPA + بيانات الـ head + المحتوى الثابت. */
function buildPage(templateHtml, options) {
  const {
    title,
    description,
    canonical,
    jsonLd,
    rootInnerHtml,
    prerenderLabel,
    lang = 'ar',
    compactJsonLd = false,
  } = options;
  let html = templateHtml;
  html = setHtmlLang(html, lang);
  html = replaceTitle(html, title);
  html = setMeta(html, 'name', 'description', description);
  html = setCanonical(html, canonical);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = injectStructuredData(html, jsonLd, compactJsonLd);
  html = injectFallbackStyle(html);
  html = injectRootContent(html, rootInnerHtml, prerenderLabel);
  html = injectFallbackScript(html);
  return `<!-- prerendered -->\n${html}`;
}

// ---------------------------------------------------------------------------
// بناء بيانات SEO والبيانات المنظمة
// ---------------------------------------------------------------------------

const HOME_TITLE = 'القرآن الكريم بالرسم العثماني — مصحف إلكتروني وتلاوات | quran.com.ly';
const HOME_DESCRIPTION =
  'مصحف إلكتروني شامل وقاعدة بيانات مفتوحة المصدر للقرآن الكريم بالرسم العثماني على quran.com.ly: تلاوات صوتية بأصوات نخبة من القرّاء آية بآية، بحث فوري في ٦٢٣٦ آية بدون تشكيل، فهرس السور، أوضاع قراءة ليلية وبيج مريحة للعين، وتنزيل بيانات JSON.';

function surahTypeLabel(surah) {
  return surah.type === 'meccan' ? 'مكية' : 'مدنية';
}

function surahCanonical(surah) {
  // سورة الفاتحة هي الصفحة الرئيسية → رابط أساسي واحد
  return surah.id === 1 ? `${SITE}/` : `${SITE}/surah/${surah.id}`;
}

function surahTitle(surah) {
  return surah.id === 1
    ? HOME_TITLE
    : `سورة ${surah.name} — القرآن الكريم بالرسم العثماني | quran.com.ly`;
}

function surahDescription(surah) {
  return `سورة ${surah.name} (${surah.transliteration}) — سورة ${surahTypeLabel(
    surah
  )}، عدد آياتها ${toArabicDigits(
    surah.total_verses
  )} آية بالرسم العثماني. اقرأها واستمع إليها آية بآية بأصوات نخبة من القرّاء على quran.com.ly.`;
}

function buildSurahStructuredData(surah, description) {
  const url = surahCanonical(surah);
  const chapterId = `${SITE}/surah/${surah.id}#chapter`;
  const chapterItem =
    surah.id === 1 ? `${SITE}/` : `${SITE}/surah/${surah.id}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Chapter',
        '@id': chapterId,
        name: `سورة ${surah.name}`,
        alternateName: [surah.transliteration],
        position: surah.id,
        inLanguage: 'ar',
        url,
        description,
        isPartOf: { '@id': `${SITE}/#book` },
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'Book',
        '@id': `${SITE}/#book`,
        name: 'القرآن الكريم',
        alternateName: 'The Quran',
        inLanguage: 'ar',
        url: `${SITE}/`,
        numberOfPages: TOTAL_SURAHS,
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'الرئيسية',
            item: `${SITE}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: `سورة ${surah.name}`,
            item: chapterItem,
          },
        ],
      },
    ],
  };
}

function buildWebPageStructuredData({ title, description, canonical }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: canonical,
    name: title,
    description,
    inLanguage: 'ar',
    isPartOf: {
      '@type': 'WebSite',
      url: `${SITE}/`,
      name: 'quran.com.ly',
    },
  };
}

// ---------------------------------------------------------------------------
// المحتوى الثابت (HTML) لكل نوع صفحة
// ---------------------------------------------------------------------------

function renderNavLinks(links) {
  const items = links
    .map((link) =>
      link.external
        ? `            <a href="${escapeHtml(link.href)}" rel="noopener noreferrer">${escapeHtml(
            link.label
          )}</a>`
        : `            <a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`
    )
    .join('\n');
  return `          <nav class="prerender-nav" aria-label="روابط التنقل">\n${items}\n          </nav>`;
}

/** محتوى مسبق لصفحة سورة كاملة: العنوان + بطاقة لكل آية. */
function renderSurahFallbackHtml(surah, surahs) {
  const versesHtml = surah.verses
    .map(
      (verse) => `            <article class="prerender-ayah" id="ayah-${surah.id}-${verse.aya}">
              <p class="prerender-ayah-text" lang="ar">${escapeHtml(verse.text)}<span class="prerender-ayah-number" aria-label="الآية ${toArabicDigits(
        verse.aya
      )}">${toArabicDigits(verse.aya)}</span></p>
            </article>`
    )
    .join('\n');

  const showBismillah = surah.id !== 9 && surah.id !== 1;
  const bismillahHtml = showBismillah
    ? `
          <p class="prerender-bismillah" lang="ar">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</p>`
    : '';

  const index = surahs.findIndex((item) => item.id === surah.id);
  const previousSurah = index > 0 ? surahs[index - 1] : null;
  const nextSurah = index >= 0 && index < surahs.length - 1 ? surahs[index + 1] : null;

  const links = [
    { href: '/', label: 'القرآن الكريم — الصفحة الرئيسية' },
    ...(previousSurah
      ? [
          {
            href: `/surah/${previousSurah.id}`,
            label: `السورة السابقة: سورة ${previousSurah.name}`,
          },
        ]
      : []),
    ...(nextSurah
      ? [
          {
            href: `/surah/${nextSurah.id}`,
            label: `السورة التالية: سورة ${nextSurah.name}`,
          },
        ]
      : []),
    { href: '/data', label: 'مستودع البيانات (JSON)' },
    { href: '/about', label: 'عن المشروع' },
  ];

  return `      <div class="prerender-fallback" dir="rtl" lang="ar">
        <div class="prerender-inner">
          <header>
            <p class="prerender-kicker">السورة رقم ${toArabicDigits(surah.id)} · ${escapeHtml(
    surah.transliteration
  )}</p>
            <h1>سورة ${escapeHtml(surah.name)}</h1>
            <p class="prerender-meta">${surahTypeLabel(
              surah
            )} · ${toArabicDigits(surah.total_verses)} آية · الرسم العثماني برواية حفص عن عاصم</p>
          </header>
          <p class="prerender-note">نسخة نصية ثابتة للقراءة والأرشفة ومحركات البحث — افتح الموقع في متصفح حديث للاستماع والتلاوة والبحث.</p>${bismillahHtml}
          <div class="prerender-verses">
${versesHtml}
          </div>
${renderNavLinks(links)}
        </div>
      </div>`;
}

/** يحمّل الترجمات الإنجليزية لجميع السور (للصفحات الإنجليزية وصفحات الآيات). */
function loadEnglishTranslations(surahs) {
  const translations = new Map();
  for (const surahMeta of surahs) {
    const translationFile = path.join(
      DATA_DIR,
      'translations',
      'en-sahih-international',
      `${surahMeta.id}.json`
    );
    const translation = readJsonFile(translationFile);
    if (!translation || !Array.isArray(translation.ayahs)) {
      throw new Error(`الترجمة الإنجليزية للسورة ${surahMeta.id} غير متاحة: ${translationFile}`);
    }
    translations.set(surahMeta.id, translation);
  }
  return translations;
}

function buildAyahStructuredData(surah, verse, canonical, description) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Chapter',
        '@id': `${SITE}/surah/${surah.id}#chapter`,
        name: `سورة ${surah.name}`,
        alternateName: [surah.transliteration],
        position: surah.id,
        inLanguage: 'ar',
        url: surahCanonical(surah),
      },
      {
        '@type': 'Quotation',
        '@id': `${canonical}#ayah`,
        text: verse.text,
        inLanguage: 'ar',
        position: verse.aya,
        isPartOf: { '@id': `${SITE}/surah/${surah.id}#chapter` },
        url: canonical,
        description,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'القرآن الكريم', item: `${SITE}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: `سورة ${surah.name}`,
            item: surahCanonical(surah),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: `الآية ${toArabicDigits(verse.aya)}`,
            item: canonical,
          },
        ],
      },
    ],
  };
}

/** محتوى ثابت لصفحة آية واحدة: النص العثماني + الترجمة + تنقل بين الآيات. */
function renderAyahFallbackHtml(surah, surahFull, verse, translationText, surahs) {
  const totalVerses = surahFull.verses.length;
  const previousVerse = verse.aya > 1 ? verse.aya - 1 : null;
  const nextVerse = verse.aya < totalVerses ? verse.aya + 1 : null;
  const showBismillah = surah.id !== 9 && surah.id !== 1 && verse.aya === 1;

  const verseLinks = [
    ...(previousVerse
      ? [
          {
            href: `/surah/${surah.id}/${previousVerse}`,
            label: `الآية السابقة (${toArabicDigits(previousVerse)})`,
          },
        ]
      : []),
    ...(nextVerse
      ? [
          {
            href: `/surah/${surah.id}/${nextVerse}`,
            label: `الآية التالية (${toArabicDigits(nextVerse)})`,
          },
        ]
      : []),
  ];

  const links = [
    { href: `/surah/${surah.id}`, label: `سورة ${surah.name} كاملة` },
    ...verseLinks,
    { href: '/', label: 'القرآن الكريم — الصفحة الرئيسية' },
    { href: '/en/surah/' + surah.id + '/' + verse.aya, label: 'English' },
  ];

  return `      <div class="prerender-fallback" dir="rtl" lang="ar">
        <div class="prerender-inner">
          <header>
            <p class="prerender-kicker">سورة ${escapeHtml(surah.name)} · ${escapeHtml(
    surah.transliteration
  )} · الآية ${toArabicDigits(verse.aya)} من ${toArabicDigits(totalVerses)}</p>
            <h1>الآية ${toArabicDigits(verse.aya)} من سورة ${escapeHtml(surah.name)}</h1>
          </header>${
            showBismillah
              ? `
          <p class="prerender-bismillah" lang="ar" dir="rtl">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</p>`
              : ''
          }
          <div class="prerender-verses">
            <article class="prerender-ayah" id="ayah-${surah.id}-${verse.aya}">
              <p class="prerender-ayah-text" lang="ar" dir="rtl">${escapeHtml(
                verse.text
              )}<span class="prerender-ayah-number" aria-label="الآية ${toArabicDigits(
    verse.aya
  )}">${toArabicDigits(verse.aya)}</span></p>
              <p class="prerender-ayah-translation" lang="en" dir="ltr">${escapeHtml(
                translationText ?? ''
              )}</p>
            </article>
          </div>
${renderNavLinks(links)}
        </div>
      </div>`;
}

function renderStaticFallbackHtml(page) {
  const paragraphs = page.paragraphs
    .map((paragraph) => `            <p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  const sections = page.sections
    .map(
      (section) => `          <div class="prerender-card">
            <h2>${escapeHtml(section.heading)}</h2>
${section.paragraphs
  .map((paragraph) => `            <p>${escapeHtml(paragraph)}</p>`)
  .join('\n')}
${section.codeLines
  .map((codeLine) => `            <code class="prerender-code">${escapeHtml(codeLine)}</code>`)
  .join('\n')}
          </div>`
    )
    .join('\n');

  return `      <div class="prerender-fallback" dir="rtl" lang="ar">
        <div class="prerender-inner">
          <header>
            <p class="prerender-kicker">quran.com.ly</p>
            <h1>${escapeHtml(page.heading)}</h1>
            <p class="prerender-meta">${escapeHtml(page.meta)}</p>
          </header>
${paragraphs}
${sections}
${renderNavLinks(page.links)}
        </div>
      </div>`;
}

// ---------------------------------------------------------------------------
// إعدادات الصفحات الثابتة (about / sources / contact / data)
// ---------------------------------------------------------------------------

/** روابط تنقل مشتركة تظهر أسفل كل صفحة ثابتة (داخلية تسهّل الأرشفة والتنقل). */
const COMMON_STATIC_LINKS = [
  { href: '/', label: 'القرآن الكريم — الصفحة الرئيسية' },
  { href: '/surah/2', label: 'سورة البقرة' },
  { href: '/about', label: 'عن المشروع' },
  { href: '/sources', label: 'المصادر والتراخيص' },
  { href: '/contact', label: 'تواصل معنا' },
  { href: '/data', label: 'مستودع البيانات (JSON)' },
];

const STATIC_PAGES = [
  {
    file: 'about.html',
    slug: 'about',
    title: 'عن المشروع | quran.com.ly',
    description:
      'عن موقع quran.com.ly: قصة المشروع، صاحب المشروع، التقنيات المستخدمة، ترخيص MIT، وكيفية استمرار تطوير هذا المصحف الإلكتروني.',
    heading: 'عن المشروع',
    meta: 'مصحف إلكتروني وقاعدة بيانات مفتوحة المصدر للقرآن الكريم',
    paragraphs: [
      'quran.com.ly مصحف إلكتروني وقاعدة بيانات مفتوحة المصدر للقرآن الكريم بالرسم العثماني برواية حفص عن عاصم، مع تلاوات صوتية بعدة قرّاء آية بآية، وبحث فوري في آيات القرآن الكريم، وفهرس للسور، وإمكانية تنزيل البيانات بصيغة JSON.',
      'بدأ المشروع بمساعدة أدوات Google AI Studio في جلب بيانات القرآن بصيغة JSON، ثم أُكمل تطويره وصيانته من صاحب المشروع. الكود والبيانات متاحان للعموم ضمن مستودع المشروع على GitHub بترخيص MIT.',
    ],
    sections: [],
    links: [
      ...COMMON_STATIC_LINKS,
      {
        href: 'https://github.com/Gamingmonster2/quran.com.ly',
        label: 'مستودع المشروع على GitHub',
        external: true,
      },
    ],
  },
  {
    file: 'sources.html',
    slug: 'sources',
    title: 'المصادر والتراخيص | quran.com.ly',
    description:
      'مصادر بيانات القرآن الكريم في quran.com.ly: نص quran-json بالرسم العثماني، تلاوات islamic.network، الخطوط والتراخيص.',
    heading: 'المصادر والتراخيص',
    meta: 'من أين تأتي نصوص القرآن وتلاواته وخطوطه في quran.com.ly',
    paragraphs: [
      'يعتمد الموقع على مصادر مفتوحة ومتاحة للعموم، مع توثيق طريقة استخدامها وترخيصها قدر الإمكان.',
    ],
    sections: [
      {
        heading: 'نص القرآن الكريم',
        paragraphs: [
          'نص القرآن الكريم (٦٢٣٦ آية) بالرسم العثماني مأخوذ من مشروع quran-json مفتوح المصدر، ويُقدَّم محليًا ضمن ملفات JSON ضمن الموقع.',
        ],
        codeLines: [],
      },
      {
        heading: 'التلاوات الصوتية',
        paragraphs: [
          'التلاوات آية بآية تُجلب من شبكة islamic.network بعدة قرّاء معروفين، ويُحفظ اختيار القارئ في المتصفح.',
        ],
        codeLines: [],
      },
      {
        heading: 'الخطوط',
        paragraphs: [
          'خطوط KFGQPC من مجمع الملك فهد لطباعة المصحف الشريف، وخطا Amiri وPlus Jakarta Sans بترخيص SIL Open Font License 1.1، وتُستضاف محليًا بدل تحميلها من خدمات خارجية.',
        ],
        codeLines: [],
      },
      {
        heading: 'الترخيص',
        paragraphs: [
          'كود الموقع مفتوح المصدر بترخيص MIT. بيانات القرآن الكريم خاضعة لأحكام المصادر الأصلية المذكورة أعلاه.',
        ],
        codeLines: [],
      },
    ],
    links: [...COMMON_STATIC_LINKS],
  },
  {
    file: 'contact.html',
    slug: 'contact',
    title: 'تواصل معنا | quran.com.ly',
    description:
      'طرق التواصل مع فريق quran.com.ly عبر مستودع المشروع على GitHub ومسائل المشروع.',
    heading: 'تواصل معنا',
    meta: 'اقتراحات وبلاغات الأخطاء وتعاون للتطوير',
    paragraphs: [
      'للتواصل مع فريق quran.com.ly، أو لاقتراح تحسين، أو للإبلاغ عن خطأ في النص أو التلاوة أو واجهة الاستخدام، يُرجى استخدام نظام المسائل (Issues) في مستودع المشروع على GitHub.',
      'لا يوجد حتى الآن بريد إلكتروني رسمي منشور للمشروع؛ وسيلة التواصل الأكثر أمانًا وشفافية هي مستودع GitHub.',
    ],
    sections: [],
    links: [
      ...COMMON_STATIC_LINKS,
      {
        href: 'https://github.com/Gamingmonster2/quran.com.ly',
        label: 'مستودع المشروع على GitHub',
        external: true,
      },
      {
        href: 'https://github.com/Gamingmonster2/quran.com.ly/issues',
        label: 'مسائل المشروع (Issues)',
        external: true,
      },
    ],
  },
  {
    file: 'data.html',
    slug: 'data',
    title: 'مستودع بيانات القرآن الكريم (JSON) | quran.com.ly',
    description:
      'تنزيل بيانات القرآن الكريم كاملة بالرسم العثماني بصيغة JSON (quran.json وquran-by-surah.json) مع هيكلية موثقة وأمثلة استخدام.',
    heading: 'مستودع بيانات القرآن الكريم (JSON)',
    meta: 'بيانات القرآن الكريم كاملة بصيغة JSON — Content API ثابت',
    paragraphs: [
      'تُقدَّم بيانات القرآن الكريم كاملة (٦٢٣٦ آية) بالرسم العثماني بصيغة JSON يمكن تنزيلها واستخدامها في التطبيقات والمواقع، مع سماح CORS للوصول من أي نطاق.',
    ],
    sections: [
      {
        heading: 'الملفات المتاحة',
        paragraphs: ['واجهات ثابتة (Content API) يمكن طلبها مباشرة من الموقع:'],
        codeLines: [
          '/assets/data/quran.json — ٦٢٣٦ آية مسطّحة { sura, aya, text }',
          '/assets/data/quran-by-surah.json — الآيات مجمّعة بحسب السورة',
          '/assets/data/surahs.json — فهرس السور (الاسم، النوع، عدد الآيات)',
        ],
      },
      {
        heading: 'محتوى إضافي',
        paragraphs: [
          'يتوفر أيضًا محتوى إضافي لكل سورة: الترجمة الإنجليزية Saheeh International، والتفسير الميسر، ومعاني الكلمات كلمة بكلمة، ضمن مجلدات البيانات نفسها.',
        ],
        codeLines: [
          '/assets/data/translations/en-sahih-international/{1..114}.json',
          '/assets/data/tafsir/muyassar/{1..114}.json',
          '/assets/data/words/{1..114}.json',
        ],
      },
    ],
    links: [
      ...COMMON_STATIC_LINKS,
      { href: '/assets/data/quran.json', label: 'تنزيل quran.json' },
      { href: '/assets/data/quran-by-surah.json', label: 'تنزيل quran-by-surah.json' },
      { href: '/assets/data/surahs.json', label: 'تنزيل surahs.json' },
    ],
  },
];

// ---------------------------------------------------------------------------
// النسخة الإنجليزية (i18n): صفحات السور + الصفحات التعريفية + الرئيسية
// ---------------------------------------------------------------------------

const HOME_TITLE_EN =
  'The Holy Quran in Uthmani Script — digital mushaf & recitations | quran.com.ly';
const HOME_DESCRIPTION_EN =
  'A complete digital mushaf and open-source dataset of the Holy Quran in Uthmani script on quran.com.ly: verse-by-verse audio from renowned reciters, instant diacritics-insensitive search over 6,236 ayahs, Saheeh International English translation, and JSON data downloads.';

const EN_COMMON_LINKS = [
  { href: '/en', label: 'The Holy Quran — Home' },
  { href: '/en/surah/2', label: 'Surah Al-Baqarah' },
  { href: '/en/about', label: 'About the project' },
  { href: '/en/api', label: 'Content API (JSON)' },
  { href: '/en/sources', label: 'Sources & licenses' },
  { href: '/en/data', label: 'Data repository' },
];

function enSurahTitle(surah) {
  return surah.id === 1
    ? HOME_TITLE_EN
    : `Surah ${surah.transliteration} (${surah.name}) — The Holy Quran | quran.com.ly`;
}

function enSurahDescription(surah) {
  if (surah.id === 1) return HOME_DESCRIPTION_EN;
  const type = surah.type === 'meccan' ? 'Meccan' : 'Medinan';
  return `Surah ${surah.transliteration} (${surah.name}) — a ${type} surah with ${surah.total_verses} verses in Uthmani script. Read it with the Saheeh International English translation and listen verse by verse from renowned reciters on quran.com.ly.`;
}

function buildSurahStructuredDataEn(surah, description, canonical) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Chapter', 'CreativeWork'],
        '@id': `${SITE}/surah/${surah.id}#chapter`,
        name: `سورة ${surah.name}`,
        alternateName: [`Surah ${surah.transliteration}`, surah.transliteration],
        position: surah.id,
        inLanguage: 'ar',
        url: canonical,
        description,
      },
      {
        '@type': 'Book',
        '@id': `${SITE}/#book`,
        name: 'The Holy Quran',
        alternateName: 'القرآن الكريم',
        inLanguage: 'ar',
        url: `${SITE}/`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/en` },
          { '@type': 'ListItem', position: 2, name: 'Surahs', item: `${SITE}/en` },
          {
            '@type': 'ListItem',
            position: 3,
            name: `Surah ${surah.transliteration}`,
            item: canonical,
          },
        ],
      },
    ],
  };
}

/** محتوى ثابت إنجليزي: نص الآية العربي + الترجمة الإنجليزية تحت كل آية. */
function renderSurahFallbackHtmlEn(surah, translation, surahs) {
  const translationsByAya = new Map();
  for (const ayah of translation.ayahs ?? []) {
    translationsByAya.set(ayah.aya, ayah.text);
  }

  const versesHtml = surah.verses
    .map((verse) => {
      const translationText = translationsByAya.get(verse.aya) ?? '';
      return `            <article class="prerender-ayah" id="ayah-${surah.id}-${verse.aya}">
              <p class="prerender-ayah-text" lang="ar" dir="rtl">${escapeHtml(
                verse.text
              )}<span class="prerender-ayah-number" aria-label="Ayah ${verse.aya}">${verse.aya}</span></p>
              <p class="prerender-ayah-translation" lang="en" dir="ltr">${escapeHtml(
                translationText
              )}</p>
            </article>`;
    })
    .join('\n');

  const showBismillah = surah.id !== 9 && surah.id !== 1;
  const bismillahHtml = showBismillah
    ? `
          <p class="prerender-bismillah" lang="ar" dir="rtl">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</p>`
    : '';

  const index = surahs.findIndex((item) => item.id === surah.id);
  const previousSurah = index > 0 ? surahs[index - 1] : null;
  const nextSurah = index >= 0 && index < surahs.length - 1 ? surahs[index + 1] : null;
  const type = surah.type === 'meccan' ? 'Meccan' : 'Medinan';

  const links = [
    { href: '/en', label: 'The Holy Quran — Home' },
    ...(previousSurah
      ? [{ href: `/en/surah/${previousSurah.id}`, label: `Previous surah: ${previousSurah.transliteration}` }]
      : []),
    ...(nextSurah
      ? [{ href: `/en/surah/${nextSurah.id}`, label: `Next surah: ${nextSurah.transliteration}` }]
      : []),
    { href: '/en/api', label: 'Content API (JSON)' },
    { href: '/en/about', label: 'About the project' },
    { href: `/surah/${surah.id}`, label: 'العربية' },
  ];

  return `      <div class="prerender-fallback" dir="ltr" lang="en">
        <div class="prerender-inner">
          <header>
            <p class="prerender-kicker">Surah no. ${surah.id} · ${escapeHtml(
    surah.transliteration
  )}</p>
            <h1>Surah ${escapeHtml(surah.transliteration)} (${escapeHtml(surah.name)})</h1>
            <p class="prerender-meta">${type} · ${surah.total_verses} verses · Uthmani script (Hafs)</p>
          </header>
          <p class="prerender-note">Static text version for reading, archiving and search engines — open the site in a modern browser for recitation, search and interactive features.</p>${bismillahHtml}
          <div class="prerender-verses">
${versesHtml}
          </div>
${renderNavLinks(links)}
        </div>
      </div>`;
}

/** محتوى ثابت إنجليزي للصفحات التعريفية. */
function renderStaticFallbackHtmlEn(page) {
  const paragraphs = page.paragraphs
    .map((paragraph) => `            <p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  const sections = page.sections
    .map(
      (section) => `          <div class="prerender-card">
            <h2>${escapeHtml(section.heading)}</h2>
${section.paragraphs
  .map((paragraph) => `            <p>${escapeHtml(paragraph)}</p>`)
  .join('\n')}
${section.codeLines
  .map((codeLine) => `            <code class="prerender-code">${escapeHtml(codeLine)}</code>`)
  .join('\n')}
          </div>`
    )
    .join('\n');

  return `      <div class="prerender-fallback" dir="ltr" lang="en">
        <div class="prerender-inner">
          <header>
            <p class="prerender-kicker">quran.com.ly</p>
            <h1>${escapeHtml(page.heading)}</h1>
            <p class="prerender-meta">${escapeHtml(page.meta)}</p>
          </header>
${paragraphs}
${sections}
${renderNavLinks(page.links)}
        </div>
      </div>`;
}

/** يضيف روابط hreflang (عربي/إنجليزي/x-default) إلى رأس الصفحة. */
function injectLanguageAlternates(html, arUrl, enUrl) {
  if (html.includes('hreflang="en"')) return html;
  const links = [
    `<link rel="alternate" hreflang="ar" href="${escapeHtml(arUrl)}" />`,
    `<link rel="alternate" hreflang="en" href="${escapeHtml(enUrl)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(arUrl)}" />`,
  ].join('\n    ');
  return html.replace('</head>', `    ${links}\n  </head>`);
}

const EN_STATIC_PAGES = [
  {
    file: 'about.html',
    slug: 'about',
    title: 'About | quran.com.ly',
    description:
      'About quran.com.ly: an open-source digital mushaf and Quran dataset with recitations, instant search, English translation, tafsir and word-by-word meanings.',
    heading: 'About the project',
    meta: 'An open-source digital mushaf and dataset of the Holy Quran',
    paragraphs: [
      'quran.com.ly is an open-source digital mushaf and dataset of the Holy Quran in the Uthmani script (Hafs narration), featuring verse-by-verse audio from several reciters, instant Arabic search, surah index, English translation, Muyassar tafsir, word-by-word meanings, and JSON data downloads.',
      'The project began with the help of Google AI Studio tools to fetch Quran data as JSON; all further development and maintenance is by the project owner. Code and data are public in the GitHub repository under the MIT license.',
    ],
    sections: [],
    links: [
      ...EN_COMMON_LINKS,
      {
        href: 'https://github.com/Gamingmonster2/quran.com.ly',
        label: 'GitHub repository',
        external: true,
      },
      { href: '/about', label: 'العربية' },
    ],
  },
  {
    file: 'sources.html',
    slug: 'sources',
    title: 'Sources & Licenses | quran.com.ly',
    description:
      'Data sources for quran.com.ly: quran-json Uthmani text, islamic.network recitations, embedded fonts and their licenses.',
    heading: 'Sources & licenses',
    meta: 'Where the Quran text, recitations and fonts of quran.com.ly come from',
    paragraphs: [
      'The site relies on open, publicly available sources, documenting their usage and licensing as thoroughly as possible.',
    ],
    sections: [
      {
        heading: 'Quran text',
        paragraphs: [
          'The Quran text (6,236 ayahs) in the Uthmani script is taken from the open-source quran-json project and served locally as JSON files within the site.',
        ],
        codeLines: [],
      },
      {
        heading: 'Recitations',
        paragraphs: [
          'Verse-by-verse recitations are fetched from the islamic.network CDN for several well-known reciters; your reciter choice is saved in the browser.',
        ],
        codeLines: [],
      },
      {
        heading: 'Fonts',
        paragraphs: [
          'KFGQPC fonts from the King Fahd Glorious Quran Printing Complex, and Amiri / Plus Jakarta Sans under the SIL Open Font License 1.1, all self-hosted instead of loading from external services.',
        ],
        codeLines: [],
      },
      {
        heading: 'License',
        paragraphs: [
          'The site code is open source under the MIT license. Quran data remains subject to the original sources listed above.',
        ],
        codeLines: [],
      },
    ],
    links: [...EN_COMMON_LINKS, { href: '/sources', label: 'العربية' }],
  },
  {
    file: 'contact.html',
    slug: 'contact',
    title: 'Contact | quran.com.ly',
    description: 'How to reach the quran.com.ly team via the GitHub repository and its issues board.',
    heading: 'Contact',
    meta: 'Suggestions, bug reports and development collaboration',
    paragraphs: [
      'To contact the quran.com.ly team, suggest an improvement, or report an issue with the text, recitation or interface, please use the GitHub repository issues board.',
      'No official project email is published yet; GitHub remains the most transparent and reliable contact channel.',
    ],
    sections: [],
    links: [
      ...EN_COMMON_LINKS,
      {
        href: 'https://github.com/Gamingmonster2/quran.com.ly',
        label: 'GitHub repository',
        external: true,
      },
      {
        href: 'https://github.com/Gamingmonster2/quran.com.ly/issues',
        label: 'Issue tracker',
        external: true,
      },
      { href: '/contact', label: 'العربية' },
    ],
  },
  {
    file: 'data.html',
    slug: 'data',
    title: 'Quran Data Repository (JSON) | quran.com.ly',
    description:
      'Download the complete Holy Quran dataset in Uthmani script as JSON (quran.json and quran-by-surah.json) with documented schema and usage examples.',
    heading: 'Quran Data Repository (JSON)',
    meta: 'The complete Quran dataset as static JSON — a static Content API',
    paragraphs: [
      'The complete Quran dataset (6,236 ayahs) in the Uthmani script is available as JSON for use in applications and websites, with CORS enabled from any origin.',
    ],
    sections: [
      {
        heading: 'Available files',
        paragraphs: ['Static Content API endpoints you can request directly:'],
        codeLines: [
          '/assets/data/quran.json — 6,236 flat ayahs { sura, aya, text }',
          '/assets/data/quran-by-surah.json — ayahs grouped by surah',
          '/assets/data/surahs.json — surah index (name, type, verse count)',
        ],
      },
      {
        heading: 'Additional content',
        paragraphs: [
          'Per-surah content is also available: Saheeh International English translation, Muyassar Arabic tafsir, and word-by-word meanings.',
        ],
        codeLines: [
          '/assets/data/translations/en-sahih-international/{1..114}.json',
          '/assets/data/tafsir/muyassar/{1..114}.json',
          '/assets/data/words/{1..114}.json',
        ],
      },
    ],
    links: [
      ...EN_COMMON_LINKS,
      { href: '/assets/data/quran.json', label: 'Download quran.json' },
      { href: '/assets/data/quran-by-surah.json', label: 'Download quran-by-surah.json' },
      { href: '/assets/data/surahs.json', label: 'Download surahs.json' },
      { href: '/en/api', label: 'API documentation' },
    ],
  },
  {
    file: 'api.html',
    slug: 'api',
    title: 'Content API | quran.com.ly',
    description:
      'The complete Holy Quran dataset (Arabic text, English translation, tafsir, word by word) as static JSON files with open CORS and full documentation.',
    heading: 'Content API',
    meta: 'Open static JSON endpoints for the Holy Quran dataset',
    paragraphs: [
      'All site data is exposed as static JSON files on the same domain, with no API keys and no rate limits, and CORS enabled for any application or website.',
    ],
    sections: [
      {
        heading: 'Endpoints',
        paragraphs: ['Fetch any of these endpoints directly from your app:'],
        codeLines: [
          'GET /assets/data/surahs.json',
          'GET /assets/data/quran.json',
          'GET /assets/data/surahs/{1..114}.json',
          'GET /assets/data/translations/en-sahih-international/{1..114}.json',
          'GET /assets/data/tafsir/muyassar/{1..114}.json',
          'GET /assets/data/words/{1..114}.json',
        ],
      },
      {
        heading: 'Audio',
        paragraphs: [
          'Verse-by-verse recitation URLs follow a fixed pattern based on the global ayah number (1..6236). Example for Al-Baqarah 255 (global number 262):',
        ],
        codeLines: ['https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3'],
      },
      {
        heading: 'Usage example',
        paragraphs: ['Fetch a surah and print its first verse:'],
        codeLines: [
          "const surah = await fetch('/assets/data/surahs/2.json').then(r => r.json());",
          'console.log(surah.verses[0].text); // الٓمٓ',
        ],
      },
    ],
    links: [...EN_COMMON_LINKS, { href: '/api', label: 'العربية' }],
  },
];

// ---------------------------------------------------------------------------
// _redirects
// ---------------------------------------------------------------------------

/**
 * يضمن أن dist/_redirects يحتوي فقط قاعدة SPA fallback الأصلية.
 *
 * لماذا لا نضيف قواعد 200 صريحة من /surah/2 إلى /surah/2.html؟
 * لأن Cloudflare Pages يطبّق «Pretty URLs» تلقائيًا: يخدم /surah/2 من
 * /surah/2.html، ويحوّل أي طلب لـ .html إلى الرابط بدون لاحقة (308). إضافة
 * قاعدة 200 نحو .html تُنشئ حلقة تحويل لا نهائية (308 → rule → 308 …)،
 * لذلك نترك الصفحات المولّدة تُخدم بالسلوك الأصلي لـ Pages.
 */
function keepSpaFallbackRedirects() {
  const redirectsPath = path.join(DIST, '_redirects');

  let fallbackFrom = '/*';
  let fallbackTo = '/index.html';
  if (fs.existsSync(redirectsPath)) {
    const original = fs.readFileSync(redirectsPath, 'utf-8');
    const match = original.match(/^\s*(\S+)\s+(\S+)\s+200\s*$/m);
    if (match && match[1] === '/*') {
      fallbackFrom = match[1];
      fallbackTo = match[2];
    }
  }

  fs.writeFileSync(redirectsPath, `${fallbackFrom}    ${fallbackTo}    200\n`, 'utf-8');
  return { explicitRules: 0, filePath: redirectsPath };
}

// ---------------------------------------------------------------------------
// التشغيل الرئيسي
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(
      'dist/index.html غير موجود — شغّل `npm run build` أولًا ثم أعد تشغيل `node scripts/prerender.mjs`.'
    );
  }

  // 1) قراءة البيانات والقالب
  const surahs = readJsonFile(SURAHS_FILE);
  const surahsWithVerses = readJsonFile(QURAN_BY_SURAH_FILE);

  if (!Array.isArray(surahs) || surahs.length !== TOTAL_SURAHS) {
    throw new Error(`surahs.json غير صالح: المتوقع ${TOTAL_SURAHS} سورة.`);
  }
  if (!Array.isArray(surahsWithVerses) || surahsWithVerses.length !== TOTAL_SURAHS) {
    throw new Error('quran-by-surah.json غير صالح: عدد السور لا يساوي 114.');
  }

  const surahsById = new Map(surahsWithVerses.map((surah) => [surah.id, surah]));
  for (const surah of surahs) {
    const full = surahsById.get(surah.id);
    if (!full || !Array.isArray(full.verses)) {
      throw new Error(`السورة ${surah.id} غير موجودة في quran-by-surah.json.`);
    }
    if (full.total_verses !== surah.total_verses) {
      throw new Error(
        `عدد آيات السورة ${surah.id} غير متطابق (${full.total_verses} ≠ ${surah.total_verses}).`
      );
    }
    if (full.verses.length !== surah.total_verses) {
      throw new Error(`نقص في آيات السورة ${surah.id}: ${full.verses.length} ≠ ${surah.total_verses}.`);
    }
  }

  const templateHtml = stripPrerenderArtifacts(fs.readFileSync(TEMPLATE_FILE, 'utf-8'));
  const translationsById = loadEnglishTranslations(surahs);
  writeFallbackAssets();

  // 2) تجهيز مجلد صفحات السور (تنظيف أي ناتج سابق)
  fs.rmSync(SURAH_DIR, { recursive: true, force: true });
  fs.mkdirSync(SURAH_DIR, { recursive: true });

  const generated = [];
  const writeFile = (filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf-8');
    generated.push({ filePath, bytes: Buffer.byteLength(content, 'utf-8') });
  };

  // 3) صفحة ثابتة لكل سورة
  for (const surahMeta of surahs) {
    const surah = surahsById.get(surahMeta.id);
    const title = surahTitle(surahMeta);
    const description = surahDescription(surahMeta);
    const canonical = surahCanonical(surahMeta);
    const html = buildPage(templateHtml, {
      title,
      description,
      canonical,
      jsonLd: buildSurahStructuredData(surahMeta, description),
      rootInnerHtml: renderSurahFallbackHtml({ ...surahMeta, verses: surah.verses }, surahs),
      prerenderLabel: 'surah',
    });
    writeFile(path.join(SURAH_DIR, `${surahMeta.id}.html`), html);
  }

  // 3.5) صفحة ثابتة لكل آية (6236 صفحة) لتحسين الأرشفة العميقة والبحث
  let ayahPageCount = 0;
  for (const surahMeta of surahs) {
    const surah = surahsById.get(surahMeta.id);
    const translation = translationsById.get(surahMeta.id);
    const translationByAya = new Map(
      (translation?.ayahs ?? []).map((ayah) => [ayah.aya, ayah.text])
    );
    const surahAyahDir = path.join(SURAH_DIR, String(surahMeta.id));
    fs.mkdirSync(surahAyahDir, { recursive: true });

    for (const verse of surah.verses) {
      const canonical = `${SITE}/surah/${surahMeta.id}/${verse.aya}`;
      const ayahNumber = toArabicDigits(verse.aya);
      const snippet = verse.text.length > 90 ? `${verse.text.slice(0, 90)}…` : verse.text;
      const title = `سورة ${surahMeta.name} — الآية ${ayahNumber} | القرآن الكريم بالرسم العثماني`;
      const description = `${snippet} — الآية ${ayahNumber} من سورة ${surahMeta.name} بالرسم العثماني، مع الترجمة الإنجليزية والتلاوة آية بآية على quran.com.ly.`;
      let html = buildPage(templateHtml, {
        title,
        description,
        canonical,
        jsonLd: buildAyahStructuredData(surahMeta, verse, canonical, description),
        rootInnerHtml: renderAyahFallbackHtml(
          surahMeta,
          surah,
          verse,
          translationByAya.get(verse.aya),
          surahs
        ),
        prerenderLabel: 'ayah',
        compactJsonLd: true,
      });
      html = injectLanguageAlternates(
        html,
        canonical,
        `${SITE}/en/surah/${surahMeta.id}/${verse.aya}`
      );
      writeFile(path.join(surahAyahDir, `${verse.aya}.html`), html);
      ayahPageCount += 1;
    }
  }

  // 4) نسخة الرئيسية داخل dist/index.html (نفس سورة الفاتحة)
  let homePrerendered = false;
  if (PRERENDER_HOME) {
    const homeSurah = surahsById.get(1);
    const homeMeta = surahs.find((surah) => surah.id === 1);
    const homeCanonical = `${SITE}/`;
    const homeHtml = buildPage(templateHtml, {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      canonical: homeCanonical,
      jsonLd: buildSurahStructuredData(homeMeta, HOME_DESCRIPTION),
      rootInnerHtml: renderSurahFallbackHtml({ ...homeMeta, verses: homeSurah.verses }, surahs),
      prerenderLabel: 'surah',
    });
    writeFile(TEMPLATE_FILE, homeHtml);
    homePrerendered = true;
  }

  // 5) الصفحات الثابتة التعريفية
  for (const page of STATIC_PAGES) {
    const canonical = `${SITE}/${page.slug}`;
    const html = buildPage(templateHtml, {
      title: page.title,
      description: page.description,
      canonical,
      jsonLd: buildWebPageStructuredData({
        title: page.title,
        description: page.description,
        canonical,
      }),
      rootInnerHtml: renderStaticFallbackHtml(page),
      prerenderLabel: page.slug,
    });
    writeFile(path.join(DIST, page.file), html);
  }

  // 5.5) النسخة الإنجليزية: /en/index.html + /en/surah/{id}.html + /en/*.html
  const EN_ROOT = path.join(DIST, 'en');
  fs.rmSync(EN_ROOT, { recursive: true, force: true });
  fs.mkdirSync(path.join(EN_ROOT, 'surah'), { recursive: true });

  const arUrlFor = (id) => (id === 1 ? `${SITE}/` : `${SITE}/surah/${id}`);
  const enUrlFor = (id) => (id === 1 ? `${SITE}/en` : `${SITE}/en/surah/${id}`);

  for (const surahMeta of surahs) {
    const surah = surahsById.get(surahMeta.id);
    const title = enSurahTitle(surahMeta);
    const description = enSurahDescription(surahMeta);
    const canonical = enUrlFor(surahMeta.id);
    let html = buildPage(templateHtml, {
      title,
      description,
      canonical,
      jsonLd: buildSurahStructuredDataEn(surahMeta, description, canonical),
      rootInnerHtml: renderSurahFallbackHtmlEn(
        { ...surahMeta, verses: surah.verses },
        translationsById.get(surahMeta.id),
        surahs
      ),
      prerenderLabel: 'surah-en',
      lang: 'en',
    });
    html = injectLanguageAlternates(html, arUrlFor(surahMeta.id), canonical);
    writeFile(path.join(EN_ROOT, 'surah', `${surahMeta.id}.html`), html);
  }

  // الصفحة الرئيسية الإنجليزية (/en)
  {
    const enHomeSurah = surahsById.get(1);
    const enHomeMeta = surahs.find((surah) => surah.id === 1);
    let html = buildPage(templateHtml, {
      title: HOME_TITLE_EN,
      description: HOME_DESCRIPTION_EN,
      canonical: `${SITE}/en`,
      jsonLd: buildSurahStructuredDataEn(enHomeMeta, HOME_DESCRIPTION_EN, `${SITE}/en`),
      rootInnerHtml: renderSurahFallbackHtmlEn(
        { ...enHomeMeta, verses: enHomeSurah.verses },
        translationsById.get(1),
        surahs
      ),
      prerenderLabel: 'surah-en',
      lang: 'en',
    });
    html = injectLanguageAlternates(html, `${SITE}/`, `${SITE}/en`);
    writeFile(path.join(EN_ROOT, 'index.html'), html);
  }

  // الصفحات التعريفية الإنجليزية
  for (const page of EN_STATIC_PAGES) {
    const canonical = `${SITE}/en/${page.slug}`;
    let html = buildPage(templateHtml, {
      title: page.title,
      description: page.description,
      canonical,
      jsonLd: buildWebPageStructuredData({
        title: page.title,
        description: page.description,
        canonical,
      }),
      rootInnerHtml: renderStaticFallbackHtmlEn(page),
      prerenderLabel: `${page.slug}-en`,
      lang: 'en',
    });
    html = injectLanguageAlternates(html, `${SITE}/${page.slug}`, canonical);
    writeFile(path.join(EN_ROOT, page.file), html);
  }

  // 5.6) إضافة روابط hreflang لكل الصفحات العربية المولّدة + الرئيسية
  for (const surahMeta of surahs) {
    const filePath = path.join(SURAH_DIR, `${surahMeta.id}.html`);
    let html = fs.readFileSync(filePath, 'utf-8');
    if (!html.includes('hreflang="en"')) {
      html = injectLanguageAlternates(html, arUrlFor(surahMeta.id), enUrlFor(surahMeta.id));
      fs.writeFileSync(filePath, html, 'utf-8');
    }
    // نسخة داخل مجلد الآيات: تضمن أن /surah/2 يُخدم صفحة السورة الكاملة
    // سواء اختار Cloudflare Pages الملف 2.html أو مجلد 2/ (الذي يحتوي صفحات الآيات).
    fs.writeFileSync(path.join(SURAH_DIR, String(surahMeta.id), 'index.html'), html, 'utf-8');
  }
  if (PRERENDER_HOME) {
    const html = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
    if (!html.includes('hreflang="en"')) {
      fs.writeFileSync(
        TEMPLATE_FILE,
        injectLanguageAlternates(html, `${SITE}/`, `${SITE}/en`),
        'utf-8'
      );
    }
  }
  for (const page of STATIC_PAGES) {
    const filePath = path.join(DIST, page.file);
    const html = fs.readFileSync(filePath, 'utf-8');
    if (!html.includes('hreflang="en"')) {
      fs.writeFileSync(
        filePath,
        injectLanguageAlternates(html, `${SITE}/${page.slug}`, `${SITE}/en/${page.slug}`),
        'utf-8'
      );
    }
  }

  // 6) إبقاء قاعدة SPA fallback فقط (Cloudflare Pages يخدم .html بدون لاحقة)
  const redirects = keepSpaFallbackRedirects();

  // 7) فحوصات سلامة سريعة على أهم مخرجات (تُفشل السكربت فورًا عند أي خلل)
  const checks = [
    {
      label: 'عدد صفحات السور = 114',
      ok:
        fs.readdirSync(SURAH_DIR).filter((name) => name.endsWith('.html')).length ===
        TOTAL_SURAHS,
    },
    {
      label: 'عنوان سورة البقرة',
      ok: fs
        .readFileSync(path.join(SURAH_DIR, '2.html'), 'utf-8')
        .includes('<title>سورة البقرة — القرآن الكريم بالرسم العثماني | quran.com.ly</title>'),
    },
    {
      label: 'canonical سورة البقرة',
      ok: fs
        .readFileSync(path.join(SURAH_DIR, '2.html'), 'utf-8')
        .includes('rel="canonical" href="https://quran.com.ly/surah/2"'),
    },
    {
      label: 'JSON-LD Chapter + Book + BreadcrumbList',
      ok: ['"@type": "Chapter"', '"@type": "Book"', '"@type": "BreadcrumbList"'].every(
        (marker) => fs.readFileSync(path.join(SURAH_DIR, '2.html'), 'utf-8').includes(marker)
      ),
    },
    {
      label: 'data-prerender="surah"',
      ok: fs.readFileSync(path.join(SURAH_DIR, '2.html'), 'utf-8').includes('data-prerender="surah"'),
    },
    {
      label: 'نص أول آية من البقرة (الٓمٓ)',
      ok: fs.readFileSync(path.join(SURAH_DIR, '2.html'), 'utf-8').includes('الٓمٓ'),
    },
    {
      label: 'canonical صفحة about',
      ok: fs
        .readFileSync(path.join(DIST, 'about.html'), 'utf-8')
        .includes('rel="canonical" href="https://quran.com.ly/about"'),
    },
    {
      label: 'صفحات ثابتة: about/sources/contact/data',
      ok: STATIC_PAGES.every((page) => fs.existsSync(path.join(DIST, page.file))),
    },
    {
      label: '_redirects يحتوي قاعدة SPA fallback فقط',
      ok: (() => {
        const lines = fs
          .readFileSync(redirects.filePath, 'utf-8')
          .trimEnd()
          .split('\n')
          .filter((line) => line.trim().length > 0);
        return (
          redirects.explicitRules === 0 &&
          lines.length === 1 &&
          /^\s*\/\*\s+\/index\.html\s+200\s*$/.test(lines[0])
        );
      })(),
    },
    {
      label: 'النسخة الإنجليزية: 114 صفحة سورة + الصفحة الرئيسية',
      ok:
        fs.readdirSync(path.join(DIST, 'en', 'surah')).filter((name) => name.endsWith('.html'))
          .length === TOTAL_SURAHS &&
        fs.existsSync(path.join(DIST, 'en', 'index.html')),
    },
    {
      label: 'صفحة السور الإنجليزية: العنوان + الترجمة',
      ok: (() => {
        const html = fs.readFileSync(path.join(DIST, 'en', 'surah', '2.html'), 'utf-8');
        return (
          html.includes('<title>Surah Al-Baqarah') &&
          html.includes('lang="en"') &&
          html.includes('Alif, Lām, Meem') &&
          html.includes('rel="canonical" href="https://quran.com.ly/en/surah/2"')
        );
      })(),
    },
    {
      label: 'روابط hreflang في الصفحات العربية والإنجليزية',
      ok:
        fs.readFileSync(path.join(SURAH_DIR, '2.html'), 'utf-8').includes('hreflang="en"') &&
        fs
          .readFileSync(path.join(DIST, 'en', 'surah', '2.html'), 'utf-8')
          .includes('hreflang="ar"'),
    },
    {
      label: 'صفحات الآيات: 6236 ملفًا (عدد آيات مطابق لكل سورة)',
      ok: (() => {
        let total = 0;
        for (const surahMeta of surahs) {
          const dir = path.join(SURAH_DIR, String(surahMeta.id));
          if (!fs.existsSync(dir)) return false;
          const files = fs
            .readdirSync(dir)
            .filter((name) => name.endsWith('.html') && name !== 'index.html');
          if (files.length !== surahMeta.total_verses) return false;
          total += files.length;
        }
        return total === 6236;
      })(),
    },
    {
      label: 'صفحة آية الكرسي: عنوان + كانونيكال + JSON-LD + hreflang',
      ok: (() => {
        const html = fs.readFileSync(path.join(SURAH_DIR, '2', '255.html'), 'utf-8');
        return (
          html.includes('<title>سورة البقرة — الآية ٢٥٥') &&
          html.includes('rel="canonical" href="https://quran.com.ly/surah/2/255"') &&
          html.includes('"@type":"Quotation"') &&
          html.includes('id="ayah-2-255"') &&
          html.includes('hreflang="en"')
        );
      })(),
    },
    {
      label: 'كل صفحة تحتوي وسم prerendered وستايل المحتوى الثابت',
      ok: fs
        .readFileSync(path.join(SURAH_DIR, '114.html'), 'utf-8')
        .includes('<!-- prerendered -->') &&
        fs
          .readFileSync(path.join(SURAH_DIR, '114.html'), 'utf-8')
          .includes('data-prerender-style'),
    },
  ];

  const failedChecks = checks.filter((check) => !check.ok);
  if (failedChecks.length > 0) {
    throw new Error(
      `فشلت فحوصات السلامة: ${failedChecks.map((check) => check.label).join(' | ')}`
    );
  }

  // 8) ملخص
  const sizes = generated.map((entry) => entry.bytes);
  const smallest = generated.reduce((min, entry) => (entry.bytes < min.bytes ? entry : min));
  const largest = generated.reduce((max, entry) => (entry.bytes > max.bytes ? entry : max));
  const totalBytes = sizes.reduce((sum, bytes) => sum + bytes, 0);

  console.log('✓ تم التصيير المسبق بنجاح:');
  console.log(`  - صفحات السور: ${TOTAL_SURAHS} ملفًا في dist/surah/ (${formatBytes(
    generated
      .filter((entry) => entry.filePath.startsWith(SURAH_DIR))
      .reduce((sum, entry) => sum + entry.bytes, 0)
  )})`);
  console.log(`  - صفحات الآيات: ${ayahPageCount} صفحة في dist/surah/{surahId}/`);
  console.log(
    `  - الصفحات الثابتة: ${STATIC_PAGES.map((page) => page.file).join('، ')}`
  );
  console.log(
    `  - dist/index.html: ${homePrerendered ? 'نسخة الرئيسية المسبقة (سورة الفاتحة)' : 'لم تُعدّل'}`
  );
  console.log(
    `  - dist/_redirects: قاعدة SPA fallback فقط (الصفحات المولّدة تُخدم عبر Pretty URLs تلقائيًا)`
  );
  console.log(`  - عدد الملفات المولّدة: ${generated.length}`);
  console.log(
    `  - أصغر ملف: dist/${path.relative(DIST, smallest.filePath)} (${formatBytes(smallest.bytes)})`
  );
  console.log(
    `  - أكبر ملف: dist/${path.relative(DIST, largest.filePath)} (${formatBytes(largest.bytes)})`
  );
  console.log(`  - إجمالي الحجم: ${formatBytes(totalBytes)}`);
  console.log(
    `  - متوسط حجم صفحة السورة: ${formatBytes(
      Math.round(
        generated
          .filter((entry) => entry.filePath.startsWith(SURAH_DIR))
          .reduce((sum, entry) => sum + entry.bytes, 0) / TOTAL_SURAHS
      )
    )}`
  );
  console.log('  - كل فحوصات السلامة الداخلية نجحت ✓');
}

try {
  main();
} catch (error) {
  console.error('✗ فشل التصيير المسبق:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
