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

function injectStructuredData(html, data) {
  // JSON منسّق بمسافات حتى تكون الحقول بصيغة `"@type": "Chapter"` المقروءة.
  const json = JSON.stringify(data, null, 2);
  const script = `    <script type="application/ld+json" id="page-structured-data">\n${json}\n    </script>`;
  return html.replace('</head>', `${script}\n  </head>`);
}

function injectFallbackStyle(html) {
  return html.replace(
    '</head>',
    `    <style data-prerender-style>${FALLBACK_CSS}    </style>\n  </head>`
  );
}

function injectFallbackScript(html) {
  return html.replace(
    '</body>',
    `    <script data-prerender-script>${FALLBACK_SCRIPT}    </script>\n  </body>`
  );
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
  const { title, description, canonical, jsonLd, rootInnerHtml, prerenderLabel } = options;
  let html = templateHtml;
  html = replaceTitle(html, title);
  html = setMeta(html, 'name', 'description', description);
  html = setCanonical(html, canonical);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = injectStructuredData(html, jsonLd);
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
// _redirects
// ---------------------------------------------------------------------------

/**
 * يعيد كتابة dist/_redirects بحيث تسبق قواعد 200 الصريحة قاعدة الـ SPA
 * fallback (تبقى القاعدة الأخيرة في النهاية). 118 قاعدة صريحة كحد أقصى
 * (114 سورة + 4 صفحات).
 */
function rewriteRedirects(surahs, staticPages) {
  const redirectsPath = path.join(DIST, '_redirects');
  const rules = [
    ...surahs.map((surah) => ({
      from: `/surah/${surah.id}`,
      to: `/surah/${surah.id}.html`,
    })),
    ...staticPages.map((page) => ({
      from: `/${page.slug}`,
      to: `/${page.file}`,
    })),
  ];

  if (rules.length > 118) {
    throw new Error(`عدد قواعد _redirects الصريحة ${rules.length} يتجاوز الحد 118.`);
  }

  const fromWidth = Math.max(...rules.map((rule) => rule.from.length), 2) + 4;
  const toWidth = Math.max(...rules.map((rule) => rule.to.length), '/index.html'.length) + 4;
  const formatRule = (from, to) => `${from.padEnd(fromWidth)}${to.padEnd(toWidth)}200`;

  // نحافظ على قاعدة fallback الأصلية إن وُجدت (وإلا نستخدم الصيغة الافتراضية).
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

  const lines = [
    ...rules.map((rule) => formatRule(rule.from, rule.to)),
    formatRule(fallbackFrom, fallbackTo),
  ];
  fs.writeFileSync(redirectsPath, `${lines.join('\n')}\n`, 'utf-8');
  return { explicitRules: rules.length, filePath: redirectsPath };
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

  // 6) إعادة كتابة _redirects
  const redirects = rewriteRedirects(surahs, STATIC_PAGES);

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
      label: '_redirects يبدأ بـ /surah/1 وينتهي بقاعدة fallback',
      ok: (() => {
        const lines = fs
          .readFileSync(redirects.filePath, 'utf-8')
          .trimEnd()
          .split('\n');
        return (
          lines.length === redirects.explicitRules + 1 &&
          lines[0].startsWith('/surah/1 ') &&
          /^\s*\/\*\s+\/index\.html\s+200\s*$/.test(lines[lines.length - 1])
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
  console.log(
    `  - الصفحات الثابتة: ${STATIC_PAGES.map((page) => page.file).join('، ')}`
  );
  console.log(
    `  - dist/index.html: ${homePrerendered ? 'نسخة الرئيسية المسبقة (سورة الفاتحة)' : 'لم تُعدّل'}`
  );
  console.log(
    `  - dist/_redirects: ${redirects.explicitRules} قاعدة 200 صريحة + قاعدة /* /index.html 200 في النهاية`
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
