#!/usr/bin/env node
/**
 * توليد عامل الخدمة (Service Worker) لموقع quran.com.ly — النقطة 20 (PWA).
 *
 * يعمل هذا السكربت بعد `vite build` (عبر postbuild) ويولّد `dist/sw.js`:
 *  - VERSION فريد لكل بناء (وقت البناء + بصمة محتوى الغلاف وحجم الأصول) فتُحدَّث الكاشات تلقائيًا.
 *  - install: تخزين الغلاف والأصول مسبقًا (precache) دون أن يُفسد ملف واحد فشل التثبيت.
 *  - activate: حذف كاشات النسخ القديمة + clients.claim.
 *  - fetch: تنقل network-first مع سقوط لـ /index.html، وبيانات/خطوط stale-while-revalidate،
 *    وبقية الأصول cache-first، مع تجاهل الطلبات الخارجية (التلاوات وواجهات API) تمامًا.
 *
 * الاستخدام:
 *   node scripts/generate-pwa.mjs            # بعد البناء: يكتب dist/sw.js ويطبع ملخصًا
 *   node scripts/generate-pwa.mjs --check    # يتحقق من بنية SW المولَّد دون كتابة أي ملف (يتطلب dist)
 *   node scripts/generate-pwa.mjs --help     # تعليمات الاستخدام
 *
 * ملاحظة اختبار: يمكن توجيه السكربت إلى مجلد بناء بديل عبر PWA_DIST_DIR (لأغراض الاختبار فقط).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const DIST_DIR = process.env.PWA_DIST_DIR
  ? path.resolve(process.env.PWA_DIST_DIR)
  : path.join(ROOT, 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');
const SW_FILE = path.join(DIST_DIR, 'sw.js');

const CACHE_PREFIX = 'quran-v';
const CHECK_ONLY = process.argv.includes('--check');
const SHOW_HELP = process.argv.includes('--help') || process.argv.includes('-h');

/** ملفات الغلاف الثابتة التي يجب أن تكون في precache */
const SHELL_FILES = ['/favicon.svg', '/site.webmanifest', '/og-image.png'];
/** ملفات بيانات القرآن الأساسية التي يجب أن تعمل دون اتصال */
const CORE_DATA_FILES = ['/assets/data/surahs.json'];
/** امتدادات الخطوط التي تُجمَع تلقائيًا من مجلدات dist */
const FONT_EXTENSIONS = /\.(?:ttf|otf|woff2?)$/i;
/** روابط ملفات JS/CSS المبنية داخل dist/index.html (اسم يحتوي بصمة المحتوى) */
const BUILD_ASSET_PATTERN = /\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g;

// ---------------------------------------------------------------------------
// أدوات مساعدة
// ---------------------------------------------------------------------------

/** يطبع رسالة خطأ وينهي التنفيذ بفشل واضح */
function die(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    die(`تعذّر قراءة الملف: ${filePath} (${error instanceof Error ? error.message : error})`);
  }
}

/** قائمة أسماء الملفات (بدون مجلدات) داخل مجلد، أو [] إن لم يوجد */
function listFiles(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/** يحوّل مسارًا مطلقًا على الموقع (مثل /assets/data/quran.json) إلى مساره في dist */
function urlToDiskPath(url) {
  const cleanUrl = url.split('#')[0].split('?')[0];
  if (cleanUrl === '/') return INDEX_FILE;
  return path.join(DIST_DIR, ...cleanUrl.replace(/^\//, '').split('/'));
}

/** حجم ملف معيّن في البناء (0 إن لم يوجد) */
function sizeOfUrl(url) {
  try {
    return fs.statSync(urlToDiskPath(url)).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ميغابايت`;
}

// ---------------------------------------------------------------------------
// بناء قائمة precache
// ---------------------------------------------------------------------------

/** يستخرج روابط JS/CSS المبنية من dist/index.html (مرة واحدة لكل رابط) */
function extractBuildAssets(html) {
  const assets = new Set();
  for (const match of html.matchAll(BUILD_ASSET_PATTERN)) assets.add(match[0]);
  return [...assets].sort();
}

/**
 * يبني قائمة precache النهائية: الغلاف المطلق + الأصول المبنية + الأيقونات والمانيفست
 * + كل الخطوط + ملفات بيانات القرآن الأساسية.
 * @returns {{precache: string[], buildAssets: string[], missing: string[]}}
 */
function buildPrecacheList(html) {
  const pieces = new Set(['/', '/index.html']);
  const missing = [];
  const buildAssets = extractBuildAssets(html);

  for (const asset of buildAssets) {
    pieces.add(asset);
    if (!fs.existsSync(urlToDiskPath(asset))) missing.push(asset);
  }

  for (const shellFile of SHELL_FILES) {
    if (fs.existsSync(urlToDiskPath(shellFile))) pieces.add(shellFile);
    else missing.push(shellFile);
  }

  const kfgqpcFonts = listFiles(path.join(DIST_DIR, 'assets', 'fonts'))
    .filter((name) => FONT_EXTENSIONS.test(name))
    .sort();
  for (const name of kfgqpcFonts) pieces.add(`/assets/fonts/${name}`);

  const webFonts = listFiles(path.join(DIST_DIR, 'fonts'))
    .filter((name) => FONT_EXTENSIONS.test(name))
    .sort();
  for (const name of webFonts) pieces.add(`/fonts/${name}`);

  for (const dataFile of CORE_DATA_FILES) {
    if (fs.existsSync(urlToDiskPath(dataFile))) pieces.add(dataFile);
    else missing.push(dataFile);
  }

  // ترتيب ثابت: الغلاف أولًا ثم بقية الملفات أبجديًا (كاش دقيق يمكن مراجعته بصريًا)
  const order = new Map();
  order.set('/', 0);
  order.set('/index.html', 1);
  const precache = [...pieces].sort((a, b) => {
    const rankA = order.has(a) ? order.get(a) : 2;
    const rankB = order.has(b) ? order.get(b) : 2;
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });

  return { precache, buildAssets, missing };
}

// ---------------------------------------------------------------------------
// الإصدار
// ---------------------------------------------------------------------------

/**
 * VERSION فريد لكل بناء: وقت البناء + بصمة sha256 لمحتوى index.html وأسماء الأصول وأحجامها.
 * أي تغيير في الغلاف أو الأصول أو بيانات القرآن يُغيّر البصمة، فيُحدَّث الكاش تلقائيًا.
 */
function buildVersion(html, precache) {
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '');
  const signature = [html, ...precache.map((url) => `${url}@${sizeOfUrl(url)}`)].join('\n');
  const hash = crypto.createHash('sha256').update(signature).digest('hex').slice(0, 10);
  return { version: `${stamp}-${hash}`, generatedAt };
}

// ---------------------------------------------------------------------------
// توليد مصدر عامل الخدمة
// ---------------------------------------------------------------------------

/**
 * يُرجع نص `sw.js` الكامل.
 * ملاحظة: كل الأنماط النصية داخل الكود المولَّد تستخدم الجمع (+) لا القوالب المائلة (template literals)
 *لتجنّب تعارضها مع قالب هذا الملف.
 */
function renderServiceWorker({ version, generatedAt, precache }) {
  return `/* عامل الخدمة (Service Worker) — موقع quran.com.ly
 * يُولَّد آليًا بواسطة scripts/generate-pwa.mjs — لا تعدّله يدويًا.
 *
 * VERSION: ${version}
 * تاريخ التوليد: ${generatedAt}
 * عدد ملفات precache: ${precache.length}
 *
 * الاستراتيجيات:
 *  - التنقل (navigation): الشبكة أولًا، ثم الكاش لنفس المسار، ثم سقوط إلى /index.html من الكاش.
 *  - /assets/data/ و /fonts/ و /assets/fonts/: الكاش أولًا مع تحديث بالخلفية (SWR).
 *  - بقية طلبات الأصل نفسه (JS/CSS/الصور...): الكاش أولًا.
 *  - الطلبات الخارجية (cdn.islamic.network، api.quran.com...): لا تُعترض، تمر للشبكة.
 */

const VERSION = ${JSON.stringify(version)};
const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const CACHE_NAME = CACHE_PREFIX + VERSION;
const OFFLINE_FALLBACK_URL = '/index.html';

// الغلاف والأصول الأساسية التي تُخزَّن مسبقًا أثناء التثبيت
const PRECACHE_URLS = ${JSON.stringify(precache, null, 2)};

// ---------------------------------------------------------------------------
// دورة الحياة
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // نخزّن كل ملف على حدة بدل cache.addAll كي لا يُفسد ملف واحد التثبيت كله
      // (لا نريد أن يحجب فشل خط واحد أو ملف بيانات غير حيوي تشغيل التطبيق دون اتصال)
      const results = await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        console.warn(
          '[sw] تعذّر تخزين ' + failed.length + ' من ' + PRECACHE_URLS.length + ' ملفًا مسبقًا (سيُجلب من الشبكة عند الحاجة)'
        );
      }
      // تفعيل النسخة الجديدة فورًا دون انتظار إغلاق التبويبات القديمة
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      // حذف كاشات النسخ القديمة من هذا التطبيق فقط (البدء بـ quran-v)
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      // السيطرة على الصفحات المفتوحة فورًا بعد التفعيل
      await self.clients.claim();
    })()
  );
});

// ---------------------------------------------------------------------------
// أدوات مساعدة
// ---------------------------------------------------------------------------

/** قراءة من كاش النسخة الحالية فقط، مع تجاهل معاملات الاستعلام عند المطابقة */
function matchFromCache(request) {
  return caches.match(request, { cacheName: CACHE_NAME, ignoreSearch: true });
}

/** تخزين استجابة ناجحة فقط، مع تجاهل أخطاء التخزين بهدوء */
async function putInCache(request, response) {
  try {
    if (!response || !response.ok) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch (error) {
    /* قد تفشل كتابة الكاش (مساحة ممتلئة أو استجابة غير قابلة للتخزين) — نتجاهلها */
  }
}

// ---------------------------------------------------------------------------
// استراتيجيات الجلب
// ---------------------------------------------------------------------------

/** كاش أولًا ثم الشبكة، مع تخزين الاستجابة الناجحة للاستخدام لاحقًا */
async function cacheFirst(request) {
  const cached = await matchFromCache(request);
  if (cached) return cached;
  const response = await fetch(request);
  void putInCache(request, response.clone());
  return response;
}

/** كاش أولًا مع تحديث بالخلفية (stale-while-revalidate) */
async function staleWhileRevalidate(request) {
  const cached = await matchFromCache(request);
  const networkResponse = fetch(request).then((response) => {
    void putInCache(request, response.clone());
    return response;
  });
  if (cached) {
    // تحديث النسخة المخزّنة يحدث في الخلفية، والرد الفوري يأتي من الكاش
    networkResponse.catch(() => {
      /* لا مشكلة إن فشل التحديث الخلفي دون اتصال */
    });
    return cached;
  }
  return networkResponse;
}

/** الشبكة أولًا لطلبات التنقل، ثم كاش لنفس المسار، ثم غلاف التطبيق المخزّن /index.html */
async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cached = await matchFromCache(request);
    if (cached) return cached;
    const shell = await caches.match(OFFLINE_FALLBACK_URL, { cacheName: CACHE_NAME });
    if (shell) return shell;
    // حالة نادرة جدًا: الغلاف نفسه غير مخزّن
    return new Response(
      '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>غير متصل</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center"><h1>لا يوجد اتصال بالإنترنت</h1><p>المحتوى المطلوب غير متاح دون اتصال. أعد المحاولة عند عودة الشبكة.</p></body></html>',
      {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// توجيه الطلبات
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // نتعامل مع GET فقط، وما عداه يمر للشبكة كما هو
  if (request.method !== 'GET') return;

  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch (error) {
    return;
  }

  // لا نعترض أي طلب خارجي (التلاوات من cdn.islamic.network وواجهات API) — يمر للشبكة مباشرة
  if (requestUrl.origin !== self.location.origin) return;

  // طلبات التنقل بين صفحات التطبيق: الشبكة أولًا مع سقوط للغلاف المخزّن
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // بيانات القرآن (كل السور والتفاسير والترجمات) وخطوط الرسم العثماني وخطوط الويب
  if (
    requestUrl.pathname.startsWith('/assets/data/') ||
    requestUrl.pathname.startsWith('/fonts/') ||
    requestUrl.pathname.startsWith('/assets/fonts/')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // بقية الملفات الثابتة من أصل الموقع (JS/CSS/الأيقونات/الصور...): كاش أولًا
  event.respondWith(cacheFirst(request));
});
`;
}

// ---------------------------------------------------------------------------
// التحقق من البنية المولَّدة
// ---------------------------------------------------------------------------

/**
 * فحص بنية SW المولَّد (بدون كتابة): يعيد قائمة فحوصات {label, ok, detail}.
 * يعمل في وضع --check وبعد الكتابة الفعلية في الوضع العادي.
 */
function validateServiceWorker({ html, buildAssets, precache, missing, version, source }) {
  const checks = [];
  const addCheck = (label, ok, detail) => checks.push({ label, ok: Boolean(ok), detail });

  addCheck('dist/index.html مقروء وغير فارغ', html.length > 0, `${html.length} حرفًا`);
  addCheck(
    'استُخرج ملف JS المبني من index.html',
    buildAssets.some((asset) => asset.endsWith('.js')),
    buildAssets.filter((asset) => asset.endsWith('.js')).join(', ') || 'لا يوجد'
  );
  addCheck(
    'استُخرج ملف CSS المبني من index.html',
    buildAssets.some((asset) => asset.endsWith('.css')),
    buildAssets.filter((asset) => asset.endsWith('.css')).join(', ') || 'لا يوجد'
  );
  addCheck('كل ملفات JS/CSS المبنية موجودة في dist', missing.length === 0 && buildAssets.length > 0,
    missing.length > 0 ? `مفقود: ${missing.join(', ')}` : 'كلها موجودة');

  addCheck(
    'قائمة precache تبدأ بالغلاف / و /index.html',
    precache[0] === '/' && precache[1] === '/index.html'
  );
  addCheck('لا تكرار في قائمة precache', new Set(precache).size === precache.length,
    `${precache.length} مدخلًا`);
  addCheck(
    'ملفات بيانات القرآن الأساسية الثلاثة مشمولة',
    CORE_DATA_FILES.every((file) => precache.includes(file)),
    CORE_DATA_FILES.filter((file) => !precache.includes(file)).join(', ') || 'الثلاثة موجودة'
  );
  addCheck(
    'أيقونات الغلاف والمانيفست وصورة OG مشمولة',
    SHELL_FILES.every((file) => precache.includes(file)),
    SHELL_FILES.filter((file) => !precache.includes(file)).join(', ') || 'كلها موجودة'
  );
  const webFontsCount = precache.filter((url) => url.startsWith('/fonts/')).length;
  const kfgqpcFontsCount = precache.filter((url) => url.startsWith('/assets/fonts/')).length;
  addCheck('خطوط الويب مشمولة في precache', webFontsCount > 0, `${webFontsCount} خطًا`);
  addCheck('خطوط KFGQPC مشمولة في precache', kfgqpcFontsCount > 0, `${kfgqpcFontsCount} خطًا`);

  const externalUrls = precache.filter((url) => !url.startsWith('/'));
  addCheck('لا روابط خارجية في precache', externalUrls.length === 0, externalUrls.join(', ') || 'كلها محلية');
  const missingPrecacheFiles = precache
    .filter((url) => url !== '/' && !fs.existsSync(urlToDiskPath(url)));
  addCheck(
    'كل ملفات precache موجودة فعليًا في dist',
    missingPrecacheFiles.length === 0,
    missingPrecacheFiles.join(', ') || 'كلها موجودة'
  );

  addCheck('صيغة VERSION صحيحة (وقت-بصمة)', /^\d{14}-[0-9a-f]{10}$/.test(version), version);
  addCheck('VERSION مضمّن في المصدر', source.includes(`const VERSION = ${JSON.stringify(version)};`));
  addCheck(
    'قائمة PRECACHE مضمّنة في المصدر',
    source.includes(JSON.stringify(precache, null, 2))
  );

  const requiredMarkers = [
    "self.addEventListener('install'",
    "self.addEventListener('activate'",
    "self.addEventListener('fetch'",
    'Promise.allSettled',
    'self.skipWaiting()',
    'self.clients.claim()',
    'caches.keys()',
    'caches.delete(',
    'cacheName: CACHE_NAME',
    'ignoreSearch: true',
    "request.mode === 'navigate'",
    "requestUrl.pathname.startsWith('/assets/data/')",
    "requestUrl.pathname.startsWith('/fonts/')",
    "requestUrl.pathname.startsWith('/assets/fonts/')",
    'requestUrl.origin !== self.location.origin',
    'networkFirstNavigation',
    'staleWhileRevalidate',
    'cacheFirst',
    'OFFLINE_FALLBACK_URL',
  ];
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));
  addCheck(
    'العناصر الأساسية لكل الاستراتيجيات موجودة في SW',
    missingMarkers.length === 0,
    missingMarkers.length > 0 ? `ناقص: ${missingMarkers.join(' | ')}` : 'كلها موجودة'
  );

  let syntaxOk = true;
  let syntaxError = '';
  try {
    // التحقق من الصحة النحوية فقط: new Function يترجم الكود دون تنفيذه
    new Function(source);
  } catch (error) {
    syntaxOk = false;
    syntaxError = error instanceof Error ? error.message : String(error);
  }
  addCheck('SW مولَّد بصيغة JavaScript صحيحة نحوياً', syntaxOk, syntaxError);

  const approximateBytes = precache.reduce((total, url) => total + sizeOfUrl(url), 0);
  addCheck('حجم precache التقريبي أكبر من صفر', approximateBytes > 0, formatBytes(approximateBytes));

  return { checks, approximateBytes };
}

/** يطبع الفحوصات ويعيد عدد الفاشلة منها */
function printChecks(checks) {
  let failed = 0;
  for (const check of checks) {
    if (check.ok) {
      console.log(`  ✓ ${check.label}${check.detail ? ` — ${check.detail}` : ''}`);
    } else {
      failed += 1;
      console.error(`  ✗ ${check.label}${check.detail ? ` — ${check.detail}` : ''}`);
    }
  }
  return failed;
}

/**
 * يقرأ dist ويبني SW في الذاكرة (دون كتابة أي ملف).
 * يُستدعى من الوضع العادي ومن --check.
 */
function prepareServiceWorker() {
  if (!fs.existsSync(DIST_DIR)) return { missingDist: true };
  if (!fs.existsSync(INDEX_FILE)) {
    die(`ملف ${path.relative(ROOT, INDEX_FILE)} غير موجود — هل اكتمل البناء؟`);
  }

  const html = readTextFile(INDEX_FILE);
  const { precache, buildAssets, missing } = buildPrecacheList(html);
  const { version, generatedAt } = buildVersion(html, precache);
  const source = renderServiceWorker({ version, generatedAt, precache });
  return { missingDist: false, html, buildAssets, precache, missing, version, generatedAt, source };
}

// ---------------------------------------------------------------------------
// التنفيذ
// ---------------------------------------------------------------------------

if (SHOW_HELP) {
  console.log(`توليد عامل الخدمة (Service Worker) لموقع quran.com.ly

الاستخدام:
  node scripts/generate-pwa.mjs            يقرأ dist ويولّد dist/sw.js ثم يطبع ملخصًا
  node scripts/generate-pwa.mjs --check    يتحقق من بنية SW المولَّد دون كتابة أي ملف
  node scripts/generate-pwa.mjs --help     هذه التعليمات

ملاحظات:
  - شغّل "npm run build" أولًا (أو اربطه بـ postbuild في package.json).
  - اضبط PWA_DIST_DIR للتحقق من بناء في مجلد بديل (اختبار فقط).
`);
  process.exit(0);
}

const prepared = prepareServiceWorker();

if (prepared.missingDist) {
  if (CHECK_ONLY) {
    console.log('ℹ لا يوجد مجلد dist — لا شيء للتحقق منه بعد.');
    console.log('  خطوات التحقق:');
    console.log('    1) شغّل: npm run build');
    console.log('    2) شغّل: node scripts/generate-pwa.mjs --check');
    process.exit(0);
  }
  console.error(`✗ مجلد dist غير موجود: ${DIST_DIR}`);
  console.error('  شغّل "npm run build" أولًا ثم أعد تشغيل هذا السكربت.');
  console.error('  (أو أضف إلى package.json: "postbuild": "node scripts/generate-pwa.mjs")');
  process.exit(1);
}

const { missing } = prepared;
if (missing.length > 0) {
  console.warn(`⚠ ملفات مطلوبة غير موجودة في البناء (ستُتخطّى): ${missing.join(', ')}`);
}

const { checks, approximateBytes } = validateServiceWorker(prepared);

if (CHECK_ONLY) {
  console.log('فحص بنية عامل الخدمة المولَّد (وضع --check — لن يُكتب أي ملف):');
  const failed = printChecks(checks);
  const { version, precache, generatedAt } = prepared;

  console.log('');
  console.log('============= ملخص SW المولَّد =============');
  console.log(`  VERSION: ${version}`);
  console.log(`  تاريخ التوليد: ${generatedAt}`);
  console.log(`  عدد ملفات precache: ${precache.length}`);
  console.log(`  الحجم التقريبي: ${formatBytes(approximateBytes)}`);
  console.log(`  ملفات JS/CSS المبنية: ${prepared.buildAssets.join(', ') || 'لا يوجد'}`);

  if (fs.existsSync(SW_FILE)) {
    const existingSource = readTextFile(SW_FILE);
    const existingVersionMatch = existingSource.match(/const VERSION = "([^"]+)";/);
    const existingVersion = existingVersionMatch ? existingVersionMatch[1] : 'غير معروف';
    const upToDate = existingVersion === version;
    console.log(
      `  dist/sw.js موجود: ${upToDate ? 'مطابق للبناء الحالي' : `قديم (VERSION=${existingVersion}) وسيُعاد توليده عند البناء`}`
    );
  } else {
    console.log('  dist/sw.js غير موجود بعد — سيُولَّد عبر postbuild بعد البناء القادم.');
  }

  if (failed > 0) {
    console.error(`\n✗ فشل ${failed} فحصًا من ${checks.length}`);
    process.exit(1);
  }
  console.log(`\n✓ نجحت جميع الفحوصات (${checks.length}/${checks.length})`);
  console.log('  التشغيل الفعلي: node scripts/generate-pwa.mjs (بعد البناء).');
  process.exit(0);
}

// ------- الوضع العادي: كتابة dist/sw.js -------
fs.writeFileSync(SW_FILE, prepared.source, 'utf-8');

const failed = printChecks(checks);
const swSize = fs.statSync(SW_FILE).size;
const { version, precache, generatedAt } = prepared;

console.log('');
console.log('============= تم توليد عامل الخدمة =============');
console.log(`  الملف: ${path.relative(ROOT, SW_FILE)} (${formatBytes(swSize)})`);
console.log(`  VERSION: ${version}`);
console.log(`  تاريخ التوليد: ${generatedAt}`);
console.log(`  عدد ملفات precache: ${precache.length}`);
console.log(`  الحجم التقريبي للتحميل المسبق: ${formatBytes(approximateBytes)}`);
console.log('  الاستراتيجيات: navigation=network-first (fallback /index.html)، data+fonts=SWR، بقية الأصول=cache-first');
console.log('  ملاحظة: تسجيل العامل يتم من src/main.tsx في الإنتاج فقط.');

if (failed > 0) {
  console.error(`\n✗ فشل ${failed} فحصًا من ${checks.length} — راجع الرسائل أعلاه.`);
  process.exit(1);
}
console.log(`\n✓ نجح التوليد والتحقق (${checks.length}/${checks.length} فحصًا).`);
