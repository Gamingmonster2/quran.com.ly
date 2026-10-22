#!/usr/bin/env node
/**
 * توليد بيانات الترجمة كلمة-بكلمة (Word-by-Word) لكل آيات القرآن الكريم.
 *
 * المصدر: Quran.com API v4
 *   GET https://api.quran.com/api/v4/verses/by_chapter/{N}
 *       ?words=true&word_fields=text_uthmani,transliteration&per_page=50&page={P}
 *
 * المخرجات: public/assets/data/words/{1..114}.json
 *   {
 *     "surahId": N,
 *     "language": "en",
 *     "words": [
 *       {
 *         "aya": 1,
 *         "entries": [
 *           { "position": 1, "text": "ٱللَّهُ", "translation": "Allah", "transliteration": "al-lahu" },
 *           ...
 *         ]
 *       },
 *       ...
 *     ]
 *   }
 *
 * ملاحظات:
 * - نأخذ فقط الكلمات من نوع char_type_name === "word" (نتجاهل "end" وهو رقم الآية، وأي نوع آخر).
 * - نقتصر على الحقول المطلوبة فقط (position/text/translation/transliteration) لتصغير الحجم،
 *   والملف يُكتب JSON مضغوطًا (بدون تنسيق) لنفس السبب.
 * - التوازي: 4 طلبات كحد أقصى، مع تباعد عام 100–200ms بين بدايات الطلبات،
 *   وإعادة محاولة حتى 3 مرات عند الفشل (5xx / 429 / أخطاء الشبكة).
 * - التحقق: 114 ملفًا، اكتمال الآيات 6236 بالترتيب، كل آية ≥1 كلمة، لا نصوص فارغة،
 *   ومقارنة عدد الكلمات لكل آية مع بيانات النص المحلية (public/assets/data/surahs/{N}.json).
 *
 * الاستخدام:
 *   node scripts/generate-words.mjs              # توليد كامل + تحقق
 *   node scripts/generate-words.mjs --verify     # تحقق فقط من الملفات الموجودة (بدون شبكة)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* الإعدادات                                                           */
/* ------------------------------------------------------------------ */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'public', 'assets', 'data');
const SURAHS_INDEX_FILE = path.join(DATA_DIR, 'surahs.json');
const LOCAL_SURAH_DIR = path.join(DATA_DIR, 'surahs');
const OUT_DIR = path.join(DATA_DIR, 'words');

const API_BASE = 'https://api.quran.com/api/v4/verses/by_chapter';
const WORD_FIELDS = 'text_uthmani,transliteration';
const PER_PAGE = 50;
const CONCURRENCY = 4; // 3–5 طلبات كحد أقصى
const DELAY_MIN_MS = 100;
const DELAY_MAX_MS = 200;
const MAX_RETRIES = 3; // المحاولة الأولى + 3 إعادات
const REQUEST_TIMEOUT_MS = 60_000;
const EXPECTED_SURAHS = 114;
const EXPECTED_VERSES = 6236;
const WORDS_SANITY_RANGE = [70_000, 85_000];

// علامات الوقف/الرموز التي قد تأتي ملتصقة أو منفصلة داخل text_uthmani (للإحصاء فقط، لا تُحذف)
const WAQF_MARK_RE = /[\u06D6-\u06DC\u06ED]/u;

const VERIFY_ONLY = process.argv.includes('--verify');

/* ------------------------------------------------------------------ */
/* أدوات مساعدة                                                        */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const pad = (value, width) => String(value).padStart(width, ' ');

/** قراءة فهرس السور والتحقق من سلامته. */
function loadSurahs() {
  if (!fs.existsSync(SURAHS_INDEX_FILE)) {
    throw new Error(`ملف فهرس السور غير موجود: ${SURAHS_INDEX_FILE}`);
  }
  const surahs = JSON.parse(fs.readFileSync(SURAHS_INDEX_FILE, 'utf-8'));
  if (!Array.isArray(surahs) || surahs.length !== EXPECTED_SURAHS) {
    throw new Error(`surahs.json غير صالح: عدد السور ${surahs?.length}`);
  }
  for (const surah of surahs) {
    if (
      !Number.isInteger(surah.id) ||
      surah.id < 1 ||
      surah.id > EXPECTED_SURAHS ||
      !Number.isInteger(surah.total_verses) ||
      surah.total_verses < 1
    ) {
      throw new Error(`بيانات سورة غير صالحة في surahs.json: ${JSON.stringify(surah)}`);
    }
  }
  const totalVerses = surahs.reduce((sum, surah) => sum + surah.total_verses, 0);
  if (totalVerses !== EXPECTED_VERSES) {
    throw new Error(`مجموع الآيات في surahs.json هو ${totalVerses} بدل ${EXPECTED_VERSES}`);
  }
  return surahs;
}

/* ------------------------------------------------------------------ */
/* تنظيم الطلبات (تهدئة + إعادة محاولة)                                 */
/* ------------------------------------------------------------------ */

// بوابة عامة: تضمن فاصلًا زمنيًا 100–200ms بين بدايات الطلبات المتوازية.
let nextRequestSlot = 0;
async function paceRequest() {
  const now = Date.now();
  const slot = Math.max(now, nextRequestSlot);
  nextRequestSlot = slot + randInt(DELAY_MIN_MS, DELAY_MAX_MS);
  if (slot > now) await sleep(slot - now);
}

/**
 * جلب JSON مع إعادة محاولة (حتى 3 إعادات) وتراجع أسّي بسيط.
 * @param {string} url
 * @param {string} label وصف قصير للطلب للرسائل
 */
async function fetchJson(url, label) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = 750 * attempt + randInt(0, 400);
      console.warn(`    ⚠ ${label}: إعادة المحاولة ${attempt}/${MAX_RETRIES} بعد ${backoff}ms (${lastError?.message})`);
      await sleep(backoff);
    }
    await paceRequest();
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} ${response.statusText}`);
        // 4xx (غير 429) خطأ دائم لا فائدة من إعادته
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (error.retryable === false) break; // خطأ دائم
      if (attempt === MAX_RETRIES) break;
    }
  }
  throw new Error(`فشل جلب ${label} بعد ${MAX_RETRIES + 1} محاولات: ${lastError?.message}`);
}

/* ------------------------------------------------------------------ */
/* جلب سورة كاملة عبر الصفحات                                          */
/* ------------------------------------------------------------------ */

/**
 * @param {{id:number,total_verses:number,name:string}} surah
 * @returns {Promise<Array>} آيات السورة مرتبة تصاعديًا حسب verse_number
 */
async function fetchSurahVerses(surah) {
  const verses = [];
  let totalPages = Math.ceil(surah.total_verses / PER_PAGE);
  let totalRecords = null;

  for (let page = 1; page <= totalPages; page++) {
    const url =
      `${API_BASE}/${surah.id}?words=true&word_fields=${WORD_FIELDS}` +
      `&per_page=${PER_PAGE}&page=${page}`;
    const data = await fetchJson(url, `السورة ${surah.id} صفحة ${page}`);

    if (!data || !Array.isArray(data.verses)) {
      throw new Error(`استجابة غير صالحة للسورة ${surah.id} صفحة ${page}`);
    }
    if (page === 1) {
      const pagination = data.pagination || {};
      if (Number.isInteger(pagination.total_pages) && pagination.total_pages > 0) {
        totalPages = pagination.total_pages;
      }
      if (Number.isInteger(pagination.total_records)) {
        totalRecords = pagination.total_records;
      }
    }
    verses.push(...data.verses);
  }

  if (totalRecords !== null && totalRecords !== surah.total_verses) {
    stats.apiRecordMismatch.push({
      surahId: surah.id,
      api: totalRecords,
      local: surah.total_verses,
    });
  }
  if (verses.length !== surah.total_verses) {
    throw new Error(
      `عدد آيات السورة ${surah.id} من الـAPI هو ${verses.length} بدل ${surah.total_verses}`
    );
  }

  verses.sort((a, b) => a.verse_number - b.verse_number);
  return verses;
}

/* ------------------------------------------------------------------ */
/* بناء كائن السورة                                                     */
/* ------------------------------------------------------------------ */

const stats = {
  charTypes: new Map(), // char_type_name => العدّ
  totalFetchedVerses: 0,
  totalWords: 0,
  emptyArabicWords: 0,
  emptyTranslation: 0,
  emptyTransliteration: 0,
  waqfMarkWords: 0,
  internalSpaceWords: 0,
  positionGaps: 0,
  positionGapExamples: [],
  apiRecordMismatch: [],
  localTokenMismatch: [],
  minWordsPerVerse: { count: Infinity, where: null },
  maxWordsPerVerse: { count: -Infinity, where: null },
};

/**
 * @param {{id:number,total_verses:number}} surah
 * @param {Array} verses
 * @returns {{surahId:number, language:string, words:Array<{aya:number, entries:Array}>}}
 */
function buildSurahData(surah, verses) {
  const ayaList = [];

  for (let index = 0; index < verses.length; index++) {
    const verse = verses[index];
    const aya = index + 1;
    if (verse.verse_number !== aya) {
      throw new Error(
        `ترتيب آيات غير متوقع في السورة ${surah.id}: توقع ${aya} ووجد ${verse.verse_number}`
      );
    }

    const rawWords = Array.isArray(verse.words) ? verse.words : [];
    const entries = [];

    for (const word of rawWords) {
      const charType = word.char_type_name || 'unknown';
      stats.charTypes.set(charType, (stats.charTypes.get(charType) || 0) + 1);
      if (charType !== 'word') continue; // نتجاهل رقم الآية "end" وأي نوع آخر

      const text = cleanText(word.text_uthmani);
      if (!text) {
        stats.emptyArabicWords += 1;
        continue; // الكلمات الفارغة تُتجاهل
      }
      const translation = cleanText(word.translation?.text);
      const transliteration = cleanText(word.transliteration?.text);
      if (!translation) stats.emptyTranslation += 1;
      if (!transliteration) stats.emptyTransliteration += 1;
      if (WAQF_MARK_RE.test(text)) stats.waqfMarkWords += 1;
      if (/\s/.test(text)) stats.internalSpaceWords += 1;

      const position = entries.length + 1; // ترقيم متصل 1..n داخل الآية
      if (word.position !== position) {
        stats.positionGaps += 1;
        if (stats.positionGapExamples.length < 10) {
          stats.positionGapExamples.push(
            `${surah.id}:${aya} (position=${word.position} ← ${position})`
          );
        }
      }

      entries.push({
        position,
        text,
        translation,
        transliteration,
      });
    }

    if (entries.length === 0) {
      throw new Error(`آية بلا كلمات بعد الفلترة: ${surah.id}:${aya}`);
    }

    if (entries.length < stats.minWordsPerVerse.count) {
      stats.minWordsPerVerse = { count: entries.length, where: `${surah.id}:${aya}` };
    }
    if (entries.length > stats.maxWordsPerVerse.count) {
      stats.maxWordsPerVerse = { count: entries.length, where: `${surah.id}:${aya}` };
    }

    ayaList.push({ aya, entries });
  }

  return { surahId: surah.id, language: 'en', words: ayaList };
}

/* ------------------------------------------------------------------ */
/* كتابة الملفات                                                       */
/* ------------------------------------------------------------------ */

/** كتابة ملف سورة JSON مضغوطًا وإرجاع حجمه بالبايت. */
function writeSurahFile(surah, data) {
  const filePath = path.join(OUT_DIR, `${surah.id}.json`);
  const json = JSON.stringify(data); // بلا مسافات — تصغير الحجم
  fs.writeFileSync(filePath, json, 'utf-8');
  return { filePath, size: Buffer.byteLength(json, 'utf-8') };
}

/* ------------------------------------------------------------------ */
/* مجمّع مهام متوازٍ بحد أقصى                                           */
/* ------------------------------------------------------------------ */

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  const errors = [];
  let nextIndex = 0;

  async function runner() {
    for (;;) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        errors.push({ item: items[index], error });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));

  if (errors.length > 0) {
    throw new AggregateError(
      errors.map((entry) => entry.error),
      `فشل ${errors.length} سورة: ${errors.map((entry) => entry.item.id).join(', ')}`
    );
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* قراءة بيانات النص المحلية للمقارنة                                  */
/* ------------------------------------------------------------------ */

/** إرجاع Map: surahId => Map: aya => عدد الكلمات في النص المحلي. */
function loadLocalWordCounts(surahs) {
  const counts = new Map();
  for (const surah of surahs) {
    const file = path.join(LOCAL_SURAH_DIR, `${surah.id}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`ملف السورة المحلي غير موجود: ${file}`);
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const perAya = new Map();
    for (const verse of data.verses || []) {
      const tokens = cleanText(verse.text).split(/\s+/u).filter(Boolean);
      perAya.set(verse.aya, tokens.length);
    }
    counts.set(surah.id, perAya);
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* التحقق من المخرجات المكتوبة على القرص                                */
/* ------------------------------------------------------------------ */

/**
 * يعيد قراءة الملفات من القرص ويتحقق منها بالكامل.
 * @returns {object} تقرير التحقق
 */
function verifyOutput(surahs) {
  const report = {
    fileCount: 0,
    totalVerses: 0,
    totalWords: 0,
    totalBytes: 0,
    largestFile: { surahId: 0, size: -1 },
    errors: [],
    emptyFieldCount: 0,
    badOrder: [],
    localTokenMismatch: [],
    minWordsPerVerse: { count: Infinity, where: null },
    maxWordsPerVerse: { count: -Infinity, where: null },
    surahWordTotals: new Map(),
  };

  if (!fs.existsSync(OUT_DIR)) {
    report.errors.push(`مجلد المخرجات غير موجود: ${OUT_DIR}`);
    return report;
  }

  const files = fs
    .readdirSync(OUT_DIR)
    .filter((name) => /^\d+\.json$/.test(name))
    .sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')));
  report.fileCount = files.length;

  if (files.length !== EXPECTED_SURAHS) {
    report.errors.push(`عدد الملفات ${files.length} بدل ${EXPECTED_SURAHS}`);
  }

  const localWordCounts = loadLocalWordCounts(surahs);
  const surahById = new Map(surahs.map((surah) => [surah.id, surah]));

  for (const fileName of files) {
    const surahId = Number(fileName.replace('.json', ''));
    const filePath = path.join(OUT_DIR, fileName);
    const size = fs.statSync(filePath).size;
    report.totalBytes += size;
    if (size > report.largestFile.size) {
      report.largestFile = { surahId, size };
    }

    const surah = surahById.get(surahId);
    if (!surah) {
      report.errors.push(`ملف سورة غير متوقع: ${fileName}`);
      continue;
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      report.errors.push(`${fileName}: JSON غير صالح (${error.message})`);
      continue;
    }

    if (data.surahId !== surahId) {
      report.errors.push(`${fileName}: surahId=${data.surahId} بدل ${surahId}`);
    }
    if (data.language !== 'en') {
      report.errors.push(`${fileName}: language="${data.language}" بدل "en"`);
    }
    if (!Array.isArray(data.words)) {
      report.errors.push(`${fileName}: الحقل words ليس مصفوفة`);
      continue;
    }
    if (data.words.length !== surah.total_verses) {
      report.errors.push(
        `${fileName}: ${data.words.length} آية بدل ${surah.total_verses}`
      );
    }

    let surahWords = 0;
    const localPerAya = localWordCounts.get(surahId);

    for (let index = 0; index < data.words.length; index++) {
      const verse = data.words[index];
      const expectedAya = index + 1;

      if (verse?.aya !== expectedAya) {
        report.badOrder.push(`${surahId}: توقع الآية ${expectedAya} ووجد ${verse?.aya}`);
        continue;
      }
      if (!Array.isArray(verse.entries) || verse.entries.length === 0) {
        report.errors.push(`${surahId}:${expectedAya}: لا كلمات في الآية`);
        continue;
      }

      for (let wordIndex = 0; wordIndex < verse.entries.length; wordIndex++) {
        const entry = verse.entries[wordIndex];
        if (entry?.position !== wordIndex + 1) {
          report.errors.push(
            `${surahId}:${expectedAya}: position=${entry?.position} بدل ${wordIndex + 1}`
          );
        }
        for (const field of ['text', 'translation', 'transliteration']) {
          if (typeof entry?.[field] !== 'string' || entry[field].length === 0) {
            report.emptyFieldCount += 1;
            if (report.emptyFieldCount <= 10) {
              report.errors.push(
                `${surahId}:${expectedAya} كلمة ${wordIndex + 1}: الحقل ${field} فارغ`
              );
            }
          } else if (entry[field] !== entry[field].trim()) {
            report.errors.push(
              `${surahId}:${expectedAya} كلمة ${wordIndex + 1}: الحقل ${field} يحتوي مسافات طرفية`
            );
          }
        }
      }

      surahWords += verse.entries.length;
      if (verse.entries.length < report.minWordsPerVerse.count) {
        report.minWordsPerVerse = {
          count: verse.entries.length,
          where: `${surahId}:${expectedAya}`,
        };
      }
      if (verse.entries.length > report.maxWordsPerVerse.count) {
        report.maxWordsPerVerse = {
          count: verse.entries.length,
          where: `${surahId}:${expectedAya}`,
        };
      }

      // مقارنة عدد كلمات الـAPI بعدد كلمات النص المحلي (معلومة، ليست خطأ بناءً)
      const localCount = localPerAya?.get(expectedAya);
      if (localCount !== verse.entries.length) {
        report.localTokenMismatch.push({
          surahId,
          aya: expectedAya,
          apiWords: verse.entries.length,
          localWords: localCount,
        });
      }
    }

    report.totalVerses += data.words.length;
    report.totalWords += surahWords;
    report.surahWordTotals.set(surahId, surahWords);
  }

  // اكتمال نطاق الملفات 1..114
  for (let surahId = 1; surahId <= EXPECTED_SURAHS; surahId++) {
    if (!files.includes(`${surahId}.json`)) {
      report.errors.push(`ملف السورة ${surahId}.json مفقود`);
    }
  }

  if (report.badOrder.length > 0) {
    report.errors.push(`ترتيب آيات غير صحيح في ${report.badOrder.length} موضعًا`);
  }
  if (report.totalVerses !== EXPECTED_VERSES) {
    report.errors.push(
      `إجمالي الآيات ${report.totalVerses} بدل ${EXPECTED_VERSES}`
    );
  }
  if (report.totalWords < WORDS_SANITY_RANGE[0] || report.totalWords > WORDS_SANITY_RANGE[1]) {
    report.errors.push(
      `إجمالي الكلمات ${report.totalWords} خارج النطاق المنطقي ${WORDS_SANITY_RANGE.join('–')}`
    );
  }

  return report;
}

/* ------------------------------------------------------------------ */
/* طباعة الملخص                                                        */
/* ------------------------------------------------------------------ */

function printVerifyReport(report) {
  console.log('\n=== التحقق من الملفات على القرص ===');
  console.log(`  الملفات: ${report.fileCount} / ${EXPECTED_SURAHS}`);
  console.log(`  الآيات: ${pad(report.totalVerses, 6)} / ${EXPECTED_VERSES}`);
  console.log(`  الكلمات: ${pad(report.totalWords, 6)}`);
  console.log(`  الحجم الكلي: ${formatBytes(report.totalBytes)} (${report.totalBytes} بايت)`);
  console.log(
    `  أكبر ملف: words/${report.largestFile.surahId}.json (${formatBytes(report.largestFile.size)})`
  );
  console.log(
    `  أقصر آية: ${report.minWordsPerVerse.count} كلمة (${report.minWordsPerVerse.where}) · ` +
      `أطول آية: ${report.maxWordsPerVerse.count} كلمة (${report.maxWordsPerVerse.where})`
  );
  console.log(`  نصوص فارغة: ${report.emptyFieldCount}`);
  console.log(`  فروق عدد الكلمات مقابل النص المحلي: ${report.localTokenMismatch.length} آية`);
  if (report.localTokenMismatch.length > 0) {
    for (const item of report.localTokenMismatch.slice(0, 10)) {
      console.log(
        `    - ${item.surahId}:${item.aya} → API=${item.apiWords}، محلي=${item.localWords}`
      );
    }
  }

  if (report.errors.length > 0) {
    console.error(`\n✗ فشل التحقق (${report.errors.length} خطأ):`);
    for (const error of report.errors.slice(0, 25)) console.error(`  - ${error}`);
    if (report.errors.length > 25) {
      console.error(`  ... و${report.errors.length - 25} خطأ آخر`);
    }
    return false;
  }
  console.log('\n✓ نجح التحقق: 114 سورة، 6236 آية بترتيب صحيح، كل آية فيها كلمات، ولا نصوص فارغة.');
  return true;
}

function printSamples(report) {
  const sample1 = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '1.json'), 'utf-8'));
  const sample2 = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '2.json'), 'utf-8'));

  const aya11 = sample1.words.find((verse) => verse.aya === 1);
  console.log(`\n  عينة 1:1 كاملة (${aya11.entries.length} كلمات):`);
  for (const entry of aya11.entries) {
    console.log(
      `    ${entry.position}. ${entry.text}  |  ${entry.translation}  |  ${entry.transliteration}`
    );
  }

  const aya2255 = sample2.words.find((verse) => verse.aya === 255);
  console.log(`\n  عينة 2:255 أول 4 كلمات (من أصل ${aya2255.entries.length}):`);
  for (const entry of aya2255.entries.slice(0, 4)) {
    console.log(
      `    ${entry.position}. ${entry.text}  |  ${entry.translation}  |  ${entry.transliteration}`
    );
  }
}

/* ------------------------------------------------------------------ */
/* التشغيل                                                             */
/* ------------------------------------------------------------------ */

async function main() {
  const surahs = loadSurahs();

  if (VERIFY_ONLY) {
    console.log('وضع التحقق فقط (--verify): لا توجد طلبات شبكة.');
    const report = verifyOutput(surahs);
    printVerifyReport(report);
    printSamples(report);
    if (report.errors.length > 0) process.exitCode = 1;
    return;
  }

  const totalRequests = surahs.reduce(
    (sum, surah) => sum + Math.ceil(surah.total_verses / PER_PAGE),
    0
  );
  console.log('=== توليد بيانات كلمة-بكلمة من Quran.com API ===');
  console.log(`  المصدر: ${API_BASE}/{1..114}`);
  console.log(`  الطلبات المتوقعة: ${totalRequests} طلبًا (per_page=${PER_PAGE})`);
  console.log(`  التوازي: ${CONCURRENCY} · تباعد ${DELAY_MIN_MS}–${DELAY_MAX_MS}ms · إعادة محاولة ×${MAX_RETRIES}`);
  console.log(`  المخرجات: ${path.relative(ROOT, OUT_DIR)}/`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const startedAt = Date.now();

  const results = await runPool(
    surahs,
    async (surah) => {
      const verses = await fetchSurahVerses(surah);
      const data = buildSurahData(surah, verses);
      const wordCount = data.words.reduce((sum, verse) => sum + verse.entries.length, 0);
      const written = writeSurahFile(surah, data);

      stats.totalFetchedVerses += data.words.length;
      stats.totalWords += wordCount;
      console.log(
        `  ✓ ${pad(surah.id, 3)} ${surah.name}: ${pad(data.words.length, 3)} آية · ` +
          `${pad(wordCount, 5)} كلمة · ${formatBytes(written.size)}`
      );
      return { surahId: surah.id, wordCount, size: written.size };
    },
    CONCURRENCY
  );

  console.log(`\n  الطلبات المكتملة: ${results.length} سورة في ${((Date.now() - startedAt) / 1000).toFixed(1)} ثانية`);

  // --- إحصاءات الجلب ---
  console.log('\n=== إحصاءات المصدر ===');
  console.log(
    `  char_type_name: ${[...stats.charTypes.entries()].map(([type, count]) => `${type}=${count}`).join(' · ')}`
  );
  console.log(`  كلمات عربية فارغة (تُجاهَل): ${stats.emptyArabicWords}`);
  console.log(`  ترجمات فارغة: ${stats.emptyTranslation} · نقل حرفي فارغ: ${stats.emptyTransliteration}`);
  console.log(
    `  كلمات تحوي علامة وقف: ${stats.waqfMarkWords} · كلمات تحوي مسافة داخلية (علامة منفصلة): ${stats.internalSpaceWords}`
  );
  console.log(`  مواضع (position) غير متصلة من الـAPI: ${stats.positionGaps}`);
  if (stats.positionGapExamples.length > 0) {
    console.log(`    أمثلة: ${stats.positionGapExamples.join(' · ')}`);
  }
  if (stats.apiRecordMismatch.length > 0) {
    console.log(`  فروق total_records مقابل surahs.json: ${stats.apiRecordMismatch.length}`);
    for (const item of stats.apiRecordMismatch.slice(0, 10)) {
      console.log(`    - السورة ${item.surahId}: API=${item.api}، محلي=${item.local}`);
    }
  }

  // --- التحقق من الملفات المكتوبة ---
  const report = verifyOutput(surahs);
  const ok = printVerifyReport(report);
  printSamples(report);

  // --- مطابقة أعداد الجلب مع أعداد القرص ---
  const diskWordSum = [...report.surahWordTotals.values()].reduce((sum, value) => sum + value, 0);
  if (stats.totalWords !== diskWordSum) {
    console.error(
      `\n✗ عدم تطابق: كلمات الجلب ${stats.totalWords} مقابل كلمات القرص ${diskWordSum}`
    );
    process.exitCode = 1;
  }
  if (stats.totalFetchedVerses !== report.totalVerses) {
    console.error(
      `\n✗ عدم تطابق الآيات: جلب ${stats.totalFetchedVerses} مقابل قرص ${report.totalVerses}`
    );
    process.exitCode = 1;
  }
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\n✗ فشل التوليد:', error);
  if (error instanceof AggregateError && error.errors) {
    for (const inner of error.errors.slice(0, 10)) {
      console.error(`  - ${inner?.message || inner}`);
    }
  }
  process.exitCode = 1;
});
