#!/usr/bin/env node
/**
 * generate-translations.mjs
 * ---------------------------------------------------------------------------
 * يولّد ترجمة "Saheeh International" الإنجليزية (Quran.com resource id = 20)
 * لكل سورة من 1 إلى 114، وينظّف النص من وسوم HTML وأرقام الهوامش وترميزات
 * HTML entities، ثم يحفظ الناتج في:
 *
 *   public/assets/data/translations/en-sahih-international/{1..114}.json
 *
 * شكل كل ملف:
 *   {
 *     "edition": { "id": 20, "name": "Saheeh International",
 *                  "language": "en", "direction": "ltr" },
 *     "surahId": N,
 *     "ayahs": [ { "aya": 1, "text": "..." }, ... ]
 *   }
 *
 * المصدر:
 *   https://api.quran.com/api/v4/quran/translations/20?chapter_number={N}
 *
 * الميزات:
 *   - إعادة محاولة تلقائية عند أخطاء الشبكة/الاستجابة (حتى 3 محاولات).
 *   - التحقق من عدد آيات كل سورة مقابل public/assets/data/surahs.json
 *     (المجموع الكلي 6236 آية) وعدم وجود نص فارغ.
 *   - يتحقق بعد الكتابة بإعادة قراءة كل ملف من القرص.
 *   - يطبع ملخصًا: عدد السور/الآيات/إجمالي الحجم/أطول وأقصر نص/عينات.
 *   - فشل واضح (exit code 1) إن تعذّر جلب سورة أو فشل التحقق.
 *
 * التشغيل:
 *   node scripts/generate-translations.mjs
 *
 * (اختياري) فحص سريع لسورة واحدة دون كتابة الملفات:
 *   node scripts/generate-translations.mjs --chapter 2 --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// الإعدادات
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const RESOURCE_ID = 20;
const EDITION = {
  id: RESOURCE_ID,
  name: 'Saheeh International',
  language: 'en',
  direction: 'ltr',
};

const API_BASE = 'https://api.quran.com/api/v4/quran/translations';
const SURAHS_FILE = path.join(PROJECT_ROOT, 'public/assets/data/surahs.json');
const OUT_DIR = path.join(
  PROJECT_ROOT,
  'public/assets/data/translations/en-sahih-international',
);

const EXPECTED_SURAH_COUNT = 114;
const EXPECTED_TOTAL_AYAHS = 6236;

const MAX_ATTEMPTS = 3; // إجمالي المحاولات لكل سورة
const RETRY_DELAYS_MS = [1000, 2500]; // التأخير قبل المحاولة 2 ثم 3
const REQUEST_TIMEOUT_MS = 30000;
const CONCURRENCY = 4; // عدد الطلبات المتوازية (لطيف مع الخادم)

// ---------------------------------------------------------------------------
// أدوات مساعدة
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** فك ترميز حرف رقمي واحد بأمان (يتجاهل القيم غير الصالحة). */
function codePointToString(codePoint) {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return '';
  }
  // لا نسمح ببعض نقاط الترميز الخطيرة/غير المرئية غير المفيدة هنا.
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) return '';
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return '';
  }
}

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  ndash: '\u2013', // –
  mdash: '\u2014', // —
  hellip: '\u2026', // …
  lsquo: '\u2018', // ‘
  rsquo: '\u2019', // ’
  ldquo: '\u201c', // “
  rdquo: '\u201d', // ”
  laquo: '\u00ab', // «
  raquo: '\u00bb', // »
  bull: '\u2022', // •
  middot: '\u00b7', // ·
  copy: '\u00a9', // ©
  reg: '\u00ae', // ®
  trade: '\u2122', // ™
  deg: '\u00b0', // °
  plusmn: '\u00b1', // ±
  times: '\u00d7', // ×
  divide: '\u00f7', // ÷
  frac12: '\u00bd', // ½
  frac14: '\u00bc', // ¼
  frac34: '\u00be', // ¾
  eacute: '\u00e9', // é
  agrave: '\u00e0', // à
  aacute: '\u00e1', // á
  ouml: '\u00f6', // ö
  uuml: '\u00fc', // ü
  szlig: '\u00df', // ß
  auml: '\u00e4', // ä
  ccedil: '\u00e7', // ç
  hyphen: '-',
  dash: '\u2010', // ‐
} // نهاية الخريطة

/**
 * يفك ترميز HTML entities (الرقمية والعشرية والسداسية عشرية والأشهر بالاسم).
 */
function decodeHtmlEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) =>
      codePointToString(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_m, dec) => codePointToString(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key)
        ? NAMED_ENTITIES[key]
        : match; // entity غير معروف: يترك كما هو ليكشفه التحقق
    });
}

/**
 * ينظّف نص الترجمة الخام:
 *  1) يحذف كتل الهوامش <sup foot_note=...>N</sup> كاملة (بما فيها الرقم).
 *  2) يحذف أي وسوم HTML متبقية.
 *  3) يفك ترميز HTML entities.
 *  4) يحذف الأحرف الاتجاهية/غير المرئية غير المفيدة.
 *  5) يوحّد المسافات (أي مسافة/سطر جديد -> مسافة واحدة) ويقصّ الأطراف.
 *
 * @param {string} raw النص الخام من API
 * @param {{supBlocks:number, tags:number, entities:number}} stats عدّادات اختيارية
 * @returns {string} النص النظيف
 */
function cleanText(raw, stats) {
  const record = stats ?? { supBlocks: 0, tags: 0, entities: 0 };
  let text = String(raw);

  // 1) كتل الهوامش <sup foot_note=...>...</sup> (المصدر قد يكتب الخاصية بلا علامات اقتباس).
  text = text.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, () => {
    record.supBlocks += 1;
    return ' ';
  });
  // أي <sup> أو </sup> متبقٍ (غير مكتمل الزوج)
  text = text.replace(/<\/?sup\b[^>]*>/gi, () => {
    record.tags += 1;
    return ' ';
  });

  // 2) حذف أي وسوم HTML متبقية (مع إبقاء النص المحتوى للوسوم غير sup).
  text = text.replace(/<[a-zA-Z/!][^>]*>/g, () => {
    record.tags += 1;
    return ' ';
  });

  // 3) فك ترميز HTML entities.
  const beforeEntities = (text.match(/&(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);/g) || [])
    .length;
  text = decodeHtmlEntities(text);
  record.entities += beforeEntities;

  // 4) إزالة علامات الاتجاه/العرض الصفري التي لا معنى لها في JSON نصي.
  text = text.replace(/[\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');

  // 5) توحيد المسافات.
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/** يتحقق أن النص النظيف سليم (لا وسوم/entities متبقية، وغير فارغ). */
function inspectCleanText(text) {
  const problems = [];
  if (!text) problems.push('نص فارغ بعد التنظيف');
  if (/<[a-zA-Z/!][^>]*>/.test(text)) problems.push('وسم HTML متبقٍ');
  if (/&(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);/.test(text)) {
    problems.push('HTML entity متبقٍ');
  }
  if (/\s{2,}/.test(text)) problems.push('مسافات مكررة');
  return problems;
}

// ---------------------------------------------------------------------------
// القراءة والتحقق من بيانات السور المرجعية
// ---------------------------------------------------------------------------

function loadSurahs() {
  if (!fs.existsSync(SURAHS_FILE)) {
    throw new Error(`ملف بيانات السور غير موجود: ${SURAHS_FILE}`);
  }
  let surahs;
  try {
    surahs = JSON.parse(fs.readFileSync(SURAHS_FILE, 'utf8'));
  } catch (err) {
    throw new Error(`تعذّر قراءة ${SURAHS_FILE}: ${err.message}`);
  }
  if (!Array.isArray(surahs) || surahs.length !== EXPECTED_SURAH_COUNT) {
    throw new Error(
      `عدد السور في surahs.json غير متوقع (المتوقع ${EXPECTED_SURAH_COUNT})`,
    );
  }
  for (const surah of surahs) {
    if (
      !surah ||
      !Number.isInteger(surah.id) ||
      surah.id < 1 ||
      surah.id > EXPECTED_SURAH_COUNT ||
      !Number.isInteger(surah.total_verses) ||
      surah.total_verses < 1
    ) {
      throw new Error(`بيانات سورة غير صالحة في surahs.json: ${JSON.stringify(surah)}`);
    }
  }
  const total = surahs.reduce((sum, s) => sum + s.total_verses, 0);
  if (total !== EXPECTED_TOTAL_AYAHS) {
    throw new Error(
      `مجموع الآيات في surahs.json = ${total} بدل ${EXPECTED_TOTAL_AYAHS}`,
    );
  }
  return surahs;
}

// ---------------------------------------------------------------------------
// الجلب من Quran.com API (مع إعادة المحاولة)
// ---------------------------------------------------------------------------

/**
 * يجلب ترجمة سورة واحدة ويعيد مصفوفة النصوص الخام مرتبة.
 * يتحقق من: HTTP 200، وجود translations[]، تطابق عدد الآيات، resource_id،
 * وعدم وجود نص فارغ. أي إخفاق قابل لإعادة المحاولة يُعاد حتى MAX_ATTEMPTS.
 */
async function fetchChapter(chapterNumber, expectedAyahCount, attempt = 1) {
  const url = `${API_BASE}/${RESOURCE_ID}?chapter_number=${chapterNumber}`;
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'quran.com.ly-data-generator/1.0 (+https://quran.com.ly)',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (err) {
      throw new Error(`استجابة ليست JSON صالحًا: ${err.message}`);
    }

    const items = payload?.translations;
    if (!Array.isArray(items)) {
      throw new Error('الاستجابة لا تحتوي على مصفوفة translations[]');
    }
    if (items.length !== expectedAyahCount) {
      throw new Error(
        `عدد الآيات المستلم ${items.length} لا يطابق total_verses (${expectedAyahCount})`,
      );
    }

    const texts = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || typeof item.text !== 'string') {
        throw new Error(`الآية رقم ${i + 1}: حقل text مفقود أو ليس نصًا`);
      }
      if (Number(item.resource_id) !== RESOURCE_ID) {
        throw new Error(
          `الآية رقم ${i + 1}: resource_id=${item.resource_id} بدل ${RESOURCE_ID}`,
        );
      }
      if (item.text.trim() === '') {
        throw new Error(`الآية رقم ${i + 1}: نص فارغ من المصدر`);
      }
      texts.push(item.text);
    }

    return { texts, meta: payload?.meta ?? {} };
  } catch (err) {
    const message = err?.name === 'TimeoutError' ? 'انتهت مهلة الطلب' : err.message;
    if (attempt >= MAX_ATTEMPTS) {
      throw new Error(
        `فشل جلب السورة ${chapterNumber} بعد ${MAX_ATTEMPTS} محاولات: ${message}`,
      );
    }
    const delay = RETRY_DELAYS_MS[attempt - 1] ?? 3000;
    console.warn(
      `  [تحذير] السورة ${chapterNumber} — المحاولة ${attempt} فشلت (${message})؛ إعادة المحاولة بعد ${delay}ms`,
    );
    await sleep(delay);
    return fetchChapter(chapterNumber, expectedAyahCount, attempt + 1);
  }
}

/** ينفّذ المهام المتزامنة مع حد أقصى للتوازي. */
async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= tasks.length) return;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// التحقق بعد الكتابة (قراءة من القرص)
// ---------------------------------------------------------------------------

function verifyWrittenFiles(surahs, stats) {
  const errors = [];
  const expectedFiles = new Set();

  let totalAyahs = 0;
  let totalBytes = 0;
  let longest = null; // { ref, length, text }
  let shortest = null;

  for (const surah of surahs) {
    const fileName = `${surah.id}.json`;
    expectedFiles.add(fileName);
    const filePath = path.join(OUT_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      errors.push(`ملف مفقود: ${fileName}`);
      continue;
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    totalBytes += Buffer.byteLength(rawContent, 'utf8');

    let data;
    try {
      data = JSON.parse(rawContent);
    } catch (err) {
      errors.push(`${fileName}: JSON غير صالح (${err.message})`);
      continue;
    }

    // edition
    if (
      !data.edition ||
      data.edition.id !== RESOURCE_ID ||
      data.edition.name !== EDITION.name ||
      data.edition.language !== 'en' ||
      data.edition.direction !== 'ltr'
    ) {
      errors.push(`${fileName}: كائن edition غير مطابق للمواصفة`);
    }
    if (data.surahId !== surah.id) {
      errors.push(`${fileName}: surahId=${data.surahId} بدل ${surah.id}`);
    }
    if (!Array.isArray(data.ayahs)) {
      errors.push(`${fileName}: ayahs ليست مصفوفة`);
      continue;
    }
    if (data.ayahs.length !== surah.total_verses) {
      errors.push(
        `${fileName}: عدد الآيات ${data.ayahs.length} بدل ${surah.total_verses}`,
      );
    }
    totalAyahs += data.ayahs.length;

    for (let i = 0; i < data.ayahs.length; i += 1) {
      const ayah = data.ayahs[i];
      const ref = `${surah.id}:${i + 1}`;
      if (!ayah || ayah.aya !== i + 1) {
        errors.push(`${fileName}: ترتيب آية غير صحيح عند ${ref}`);
        continue;
      }
      if (typeof ayah.text !== 'string') {
        errors.push(`${fileName}: نص الآية ${ref} ليس نصًا`);
        continue;
      }
      const problems = inspectCleanText(ayah.text);
      if (problems.length > 0) {
        errors.push(`${ref}: ${problems.join(' / ')}`);
      }
      const length = ayah.text.length;
      if (!longest || length > longest.length) {
        longest = { ref, length, text: ayah.text };
      }
      if (!shortest || length < shortest.length) {
        shortest = { ref, length, text: ayah.text };
      }
    }
  }

  // ملفات غير متوقعة داخل مجلد الترجمة
  const actualFiles = fs
    .readdirSync(OUT_DIR)
    .filter((name) => name.endsWith('.json'));
  const unexpected = actualFiles.filter((name) => !expectedFiles.has(name));
  if (unexpected.length > 0) {
    errors.push(`ملفات غير متوقعة في مجلد الترجمة: ${unexpected.join(', ')}`);
  }

  stats.totalAyahs = totalAyahs;
  stats.totalBytes = totalBytes;
  stats.fileCount = actualFiles.length;
  stats.longest = longest;
  stats.shortest = shortest;

  return errors;
}

// ---------------------------------------------------------------------------
// البرنامج الرئيسي
// ---------------------------------------------------------------------------

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function truncate(text, max = 160) {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function parseArgs(argv) {
  const options = { chapter: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--chapter') {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value < 1 || value > EXPECTED_SURAH_COUNT) {
        throw new Error('--chapter يتطلب رقم سورة بين 1 و114');
      }
      options.chapter = value;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        'الاستخدام: node scripts/generate-translations.mjs [--chapter N] [--dry-run]',
      );
      process.exit(0);
    } else {
      throw new Error(`خيار غير معروف: ${arg}`);
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();

  console.log('=== مولّد ترجمة Saheeh International (quran.com.ly) ===');
  console.log(`المصدر: ${API_BASE}/${RESOURCE_ID}?chapter_number={1..114}`);
  console.log(`مجلد الإخراج: ${path.relative(PROJECT_ROOT, OUT_DIR)}`);
  if (options.dryRun) console.log('الوضع: --dry-run (لن تُكتب أي ملفات)');
  console.log('');

  // 1) بيانات السور المرجعية والتحقق منها.
  const surahs = loadSurahs();
  const expectedTotal = surahs.reduce((sum, s) => sum + s.total_verses, 0);
  console.log(
    `✔ surahs.json: ${surahs.length} سورة، ${expectedTotal} آية إجمالًا (يُتوقع ${EXPECTED_TOTAL_AYAHS})`,
  );

  const targets = options.chapter
    ? surahs.filter((s) => s.id === options.chapter)
    : surahs;

  // 2) الجلب (كل شيء في الذاكرة أولًا؛ لا كتابة جزئية عند الفشل).
  console.log(
    `\n⬇ جلب ${targets.length} سورة من Quran.com API بتوازٍ ${CONCURRENCY}…`,
  );
  const fetched = new Array(surahs.length);

  const tasks = targets.map((surah) => async () => {
    const { texts, meta } = await fetchChapter(surah.id, surah.total_verses);
    fetched[surah.id - 1] = { surah, texts, meta };
    const position = targets.indexOf(surah) + 1;
    console.log(
      `  [${String(position).padStart(3, ' ')}/${targets.length}] السورة ${surah.id} (${surah.transliteration}): ${texts.length} آية ✔`,
    );
  });
  await runPool(tasks, CONCURRENCY);

  // 3) التنظيف + بناء الكائنات + التحقق قبل الكتابة.
  const cleanStats = { supBlocks: 0, tags: 0, entities: 0 };
  const collectAyahErrors = [];
  const payloads = [];

  for (const entry of fetched) {
    if (!entry) continue;
    const { surah, texts } = entry;
    if (texts.length !== surah.total_verses) {
      collectAyahErrors.push(
        `السورة ${surah.id}: ${texts.length} آية بدل ${surah.total_verses}`,
      );
      continue;
    }
    const ayahs = texts.map((raw, index) => {
      const text = cleanText(raw, cleanStats);
      const problems = inspectCleanText(text);
      if (problems.length > 0) {
        collectAyahErrors.push(`${surah.id}:${index + 1} — ${problems.join(' / ')}`);
      }
      return { aya: index + 1, text };
    });
    payloads.push({
      edition: { ...EDITION },
      surahId: surah.id,
      ayahs,
    });
  }

  if (collectAyahErrors.length > 0) {
    console.error('\n✘ أخطاء في النصوص بعد التنظيف:');
    for (const error of collectAyahErrors.slice(0, 20)) console.error(`  - ${error}`);
    throw new Error(`فشل التحقق من ${collectAyahErrors.length} نص/آية`);
  }

  const cleanedAyahCount = payloads.reduce((sum, p) => sum + p.ayahs.length, 0);
  console.log(
    `\n🧼 التنظيف: أُزيلت ${cleanStats.supBlocks} كتلة <sup> هوامش، ${cleanStats.tags} وسم HTML، وفُكّت ${cleanStats.entities} ترميز entity.`,
  );
  console.log(`عدد الآيات بعد التنظيف: ${cleanedAyahCount}`);

  // 4) الكتابة.
  if (!options.dryRun) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const payload of payloads) {
      const filePath = path.join(OUT_DIR, `${payload.surahId}.json`);
      fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    }
    console.log(`💾 كُتبت ${payloads.length} ملفًا في ${path.relative(PROJECT_ROOT, OUT_DIR)}`);
  } else {
    console.log('(dry-run) لم تُكتب ملفات.');
  }

  // 5) تحقق بعد الكتابة (قراءة من القرص) — فقط في الوضع الكامل الكامل.
  let verifyErrors = [];
  const postStats = {};
  if (!options.dryRun && !options.chapter) {
    console.log('\n🔎 التحقق النهائي بقراءة الملفات من القرص…');
    verifyErrors = verifyWrittenFiles(surahs, postStats);
    if (verifyErrors.length > 0) {
      console.error('✘ فشل التحقق النهائي:');
      for (const error of verifyErrors.slice(0, 30)) console.error(`  - ${error}`);
      throw new Error(`فشل التحقق النهائي: ${verifyErrors.length} خطأ`);
    }
    if (postStats.totalAyahs !== EXPECTED_TOTAL_AYAHS) {
      throw new Error(
        `إجمالي الآيات في الملفات ${postStats.totalAyahs} بدل ${EXPECTED_TOTAL_AYAHS}`,
      );
    }
    console.log(
      `✔ تحقق ناجح: ${postStats.fileCount} ملفًا، ${postStats.totalAyahs} آية، ${formatBytes(postStats.totalBytes)}`,
    );
  }

  // 6) الملخص.
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log('\n================ الملخص ================');
  console.log(`عدد السور (الملفات): ${payloads.length}`);
  console.log(`عدد الآيات: ${cleanedAyahCount}`);
  if (!options.dryRun && !options.chapter) {
    console.log(`عدد الملفات على القرص: ${postStats.fileCount}`);
    console.log(`إجمالي الحجم على القرص: ${formatBytes(postStats.totalBytes)}`);
    if (postStats.longest) {
      console.log(
        `أطول نص: ${postStats.longest.ref} (${postStats.longest.length} حرفًا): ${truncate(postStats.longest.text)}`,
      );
    }
    if (postStats.shortest) {
      console.log(
        `أقصر نص: ${postStats.shortest.ref} (${postStats.shortest.length} حرفًا): ${truncate(postStats.shortest.text)}`,
      );
    }
  }
  console.log(`الزمن: ${elapsed}s`);
  console.log('=========================================');

  // 7) عينات نصية للتأكيد.
  const sample = (surahId, ayaId) => {
    const entry = fetched[surahId - 1];
    if (!entry) return '(غير متوفر)';
    return cleanText(entry.texts[ayaId - 1]);
  };
  if (!options.chapter || options.chapter === 1) {
    console.log(`\nعينة 1:1 → ${sample(1, 1)}`);
  }
  if (!options.chapter || options.chapter === 2) {
    console.log(`عينة 2:255 → ${sample(2, 255)}`);
  }
  if (options.chapter && options.chapter !== 1 && options.chapter !== 2) {
    console.log(`\nعينة ${options.chapter}:1 → ${sample(options.chapter, 1)}`);
  }

  console.log('\n✅ اكتمل التوليد بنجاح.');
}

main().catch((err) => {
  console.error(`\n✘ فشل: ${err.message}`);
  process.exitCode = 1;
});

// ---------------------------------------------------------------------------
// أوامر التشغيل
// ---------------------------------------------------------------------------
//   node scripts/generate-translations.mjs
//       # توليد كامل: 114 سورة -> public/assets/data/translations/en-sahih-international/
//
//   node scripts/generate-translations.mjs --chapter 2
//       # جلب سورة واحدة فقط (2) لفحص سريع؛ لا يُعفى من التحقق النهائي الشامل.
//
//   node scripts/generate-translations.mjs --chapter 2 --dry-run
//       # فحص سورة واحدة فقط دون كتابة أي ملف على القرص.
//
//   node scripts/generate-translations.mjs --help
//       # عرض المساعدة.
//
// ملاحظة: يتطلب اتصالًا بالإنترنت (api.quran.com). السكربت لا يكتب خارج
// scripts/generate-translations.mjs (نفسه) و public/assets/data/translations/.
// ---------------------------------------------------------------------------
