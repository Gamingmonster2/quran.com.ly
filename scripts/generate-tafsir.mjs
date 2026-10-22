#!/usr/bin/env node
/**
 * scripts/generate-tafsir.mjs
 * ---------------------------------------------------------------------------
 * يولّد ملفات التفسير الميسر العربي محليًا (خادم ملفات ثابتة) من واجهة Quran.com.
 *
 * المصدر : https://api.quran.com/api/v4/tafsirs/16/by_chapter/{N}  (N = 1..114)
 *          الاحتياط (للآيات التي يُسقطها by_chapter): by_ayah/{N}:{A}
 * الإخراج: public/assets/data/tafsir/muyassar/{N}.json
 *          { "edition": {id,name,language,direction}, "surahId": N,
 *            "ayahs": [{ "aya": 1, "text": "..." }, ...] }
 *
 * ملاحظات مُتحقَّق منها عمليًا من المصدر:
 *  - الواجهة تُرجع 10 سجلات افتراضيًا (pagination)، لذا نمرّ على كل الصفحات.
 *  - بعض الآيات يربطها المصدر بتفسير مُجمَّع لعدة آيات متتالية، فيُرفق النص
 *    بأول آية من المجموعة فقط ويُسقط بقية الآيات من استجابة by_chapter.
 *    نغطّي هذه الفجوات عبر by_ayah من الإصدار نفسه (id=16) — لا تخمين.
 *
 * التشغيل: node scripts/generate-tafsir.mjs
 * ---------------------------------------------------------------------------
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCE = {
  editionId: 16,
  editionName: 'التفسير الميسر',
  language: 'ar',
  direction: 'rtl',
  chapterUrl: (n) => `https://api.quran.com/api/v4/tafsirs/16/by_chapter/${n}`,
  ayahUrl: (n, a) => `https://api.quran.com/api/v4/tafsirs/16/by_ayah/${n}:${a}`,
};

const OPTIONS = {
  perPage: 300, // أكبر سورة 286 آية => صفحة واحدة في الحالة الطبيعية
  maxPages: 50, // حارس ضد أي حلقة لا نهائية
  retries: 3, // إعادة المحاولة عند أخطاء الشبكة
  retryBaseDelayMs: 700,
  requestTimeoutMs: 45000,
  requestDelayMs: 100, // تهدئة بسيطة بين الطلبات
  totalAyahsExpected: 6236,
  totalSurahsExpected: 114,
};

const SURAHS_FILE = path.join(ROOT, 'public', 'assets', 'data', 'surahs.json');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'data', 'tafsir', 'muyassar');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------------------------------- */
/*                                 أدوات HTTP                                 */
/* -------------------------------------------------------------------------- */

async function fetchJson(url, label) {
  let lastError = null;

  for (let attempt = 1; attempt <= OPTIONS.retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPTIONS.requestTimeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'quran.com.ly/tafsir-data-builder (+https://quran.com.ly)',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      const reason = error?.name === 'AbortError' ? 'انتهت مهلة الطلب' : error?.message ?? String(error);
      if (attempt < OPTIONS.retries) {
        const delay = OPTIONS.retryBaseDelayMs * attempt + Math.floor(Math.random() * 250);
        console.warn(`  ! محاولة ${attempt}/${OPTIONS.retries} فشلت (${label}): ${reason} — إعادة بعد ${delay}ms`);
        await sleep(delay);
      } else {
        lastError = new Error(`${reason} (بعد ${OPTIONS.retries} محاولات)`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`تعذّر جلب ${label} — ${lastError?.message ?? 'خطأ غير معروف'}`);
}

/* -------------------------------------------------------------------------- */
/*                            تنظيف نص HTML إلى نص                            */
/* -------------------------------------------------------------------------- */

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  sbquo: '‚',
  bdquo: '„',
  times: '×',
  divide: '÷',
  plusmn: '±',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  sup2: '²',
  sup3: '³',
  micro: 'µ',
  para: '¶',
  sect: '§',
  middot: '·',
  bull: '•',
  dagger: '†',
  Dagger: '‡',
  permil: '‰',
  prime: '′',
  Prime: '″',
  larr: '←',
  rarr: '→',
  harr: '↔',
  minus: '−',
  shy: '',
  zwj: '',
  zwnj: '',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  rlm: '‏',
  lrm: '‎',
  rle: '‫',
  rlo: '‮',
  pdf: '‬',
};

const ENTITY_PATTERN = /&(#(?:x[0-9a-fA-F]+|\d+)|[a-zA-Z][a-zA-Z0-9]{1,31});/g;

function decodeEntities(input) {
  return input.replace(ENTITY_PATTERN, (match, body) => {
    if (body.startsWith('#')) {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const codePoint = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      if (Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }
    const named = NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

const BLOCK_TAG_NAMES = 'p|div|section|article|header|footer|main|aside|blockquote|pre|h[1-6]|li|ul|ol|dl|dt|dd|table|thead|tbody|tfoot|tr|td|th|figure|figcaption|hr';

/**
 * يحوّل HTML التفسير إلى نص نظيف:
 *  - `<br>` وحدود الفقرات/العناوين/القوائم => أسطر جديدة
 *  - إزالة كل الوسوم مع إبقاء نصها
 *  - فكّ HTML entities
 *  - ضغط الفراغات والأسطر الفارغة، وتنظيف المسافات حول الترقيم العربي
 *  - إبقاء التشكيل والعلامات العربية كما هي
 */
function htmlToText(rawHtml) {
  if (typeof rawHtml !== 'string' || rawHtml.trim() === '') return '';

  let text = rawHtml;

  // 1) وسوم الفواصل => أسطر جديدة قبل إزالة الوسوم.
  text = text.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  text = text.replace(new RegExp(`<\\s*\\/\\s*(?:${BLOCK_TAG_NAMES})\\s*>`, 'gi'), '\n');
  text = text.replace(new RegExp(`<\\s*(?:${BLOCK_TAG_NAMES})\\b[^>]*>`, 'gi'), '\n');
  text = text.replace(/<\s*(?:li|td|th)\b[^>]*>/gi, '\n');

  // 2) إزالة التعليقات ثم كل الوسوم المتبقية مع إبقاء نصها.
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<[^>]*>/g, '');

  // 3) فكّ HTML entities.
  text = decodeEntities(text);

  // 4) تطبيع المسافات والمحارف الخفية.
  text = text.replace(/\r\n?/g, '\n');
  text = text.replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ');
  text = text.replace(/[\u200b\u200e\u200f\u202a-\u202e\ufeff]/g, '');
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ');

  // 5) تنظيف كل سطر على حدة، وإسقاط الأسطر الفارغة.
  const lines = text
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter((line) => line !== '');

  text = lines.join('\n');

  // 6) إزالة الفراغات الزائدة حول الترقيم والأقواس (علامات الترقيم العربية تبقى).
  text = text.replace(/[ \t]+([،؛؟!.,:،؛؟])/g, '$1');
  text = text.replace(/([(\[{«])\s+/g, '$1');
  text = text.replace(/\s+([)\]}»])/g, '$1');
  text = text.replace(/\n{2,}/g, '\n');

  return text.trim();
}

/* -------------------------------------------------------------------------- */
/*                              جمع بيانات سورة                               */
/* -------------------------------------------------------------------------- */

function parseVerseKey(verseKey, surahId) {
  if (typeof verseKey !== 'string') return null;
  const match = /^(\d{1,3}):(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/.exec(verseKey.trim());
  if (!match) return null;
  const surah = Number(match[1]);
  const startAyah = Number(match[2]);
  const endAyah = match[3] ? Number(match[3]) : startAyah;
  if (surah !== surahId) return null;
  if (startAyah < 1 || endAyah < startAyah) return null;
  return { startAyah, endAyah };
}

/**
 * يجلب كل صفحات by_chapter لسورة، ويعيد خريطة (رقم الآية => النص الخام).
 * يسجّل أي شذوذ في الاستجابة (آية من سورة أخرى، مفتاح غير صالح، تكرار، إلخ).
 */
async function fetchChapterTafsirs(surah, anomalies) {
  const rawByAyah = new Map();
  const duplicates = [];
  const invalidKeys = [];
  let page = 1;
  let totalPages = 1;
  let declaredRecords = null;

  while (page <= totalPages && page <= OPTIONS.maxPages) {
    const url = `${SOURCE.chapterUrl(surah.id)}?per_page=${OPTIONS.perPage}&page=${page}`;
    const label = `سورة ${surah.id} (${surah.name}) صفحة ${page}`;
    const data = await fetchJson(url, label);

    const records = Array.isArray(data?.tafsirs) ? data.tafsirs : [];
    const pagination = data?.pagination ?? {};
    totalPages = Math.max(1, Number(pagination.total_pages) || 1);
    if (Number.isFinite(Number(pagination.total_records))) {
      declaredRecords = Number(pagination.total_records);
    }

    for (const record of records) {
      const range = parseVerseKey(record?.verse_key, surah.id);
      if (!range) {
        invalidKeys.push(record?.verse_key ?? '(بدون مفتاح)');
        continue;
      }
      const rawText = typeof record?.text === 'string' ? record.text : '';
      for (let aya = range.startAyah; aya <= range.endAyah; aya += 1) {
        if (rawByAyah.has(aya)) {
          if (rawByAyah.get(aya) !== rawText) {
            duplicates.push({ aya, previousLength: String(rawByAyah.get(aya)).length, newLength: rawText.length });
          }
          continue;
        }
        rawByAyah.set(aya, rawText);
      }
    }

    page += 1;
    if (page <= totalPages) await sleep(OPTIONS.requestDelayMs);
  }

  return { rawByAyah, duplicates, invalidKeys, declaredRecords };
}

/**
 * يجلب تفسير آية واحدة مباشرة (by_ayah) — يُستخدم فقط لتغطية الفجوات التي
 * يُسقطها by_chapter، من الإصدار نفسه (16) دون أي تخمين.
 */
async function fetchAyahTafsir(surahId, aya) {
  const url = SOURCE.ayahUrl(surahId, aya);
  const data = await fetchJson(url, `${surahId}:${aya}`);
  const tafsir = data?.tafsir ?? null;
  if (!tafsir) return { text: '', group: [], resourceId: null };
  const verses = tafsir?.verses && typeof tafsir.verses === 'object' ? Object.keys(tafsir.verses) : [];
  return {
    text: typeof tafsir.text === 'string' ? tafsir.text : '',
    group: verses,
    resourceId: tafsir.resource_id ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 التحقق                                     */
/* -------------------------------------------------------------------------- */

function validateEdition(edition) {
  const problems = [];
  if (!Array.isArray(edition)) {
    problems.push('ملف surahs.json ليس مصفوفة كائنات');
    return { problems, surahs: [], expectedTotal: 0 };
  }
  if (edition.length !== OPTIONS.totalSurahsExpected) {
    problems.push(`عدد السور ${edition.length} بدل ${OPTIONS.totalSurahsExpected}`);
  }
  const ids = new Set();
  for (const surah of edition) {
    if (!Number.isInteger(surah?.id) || surah.id < 1 || surah.id > 114) problems.push(`معرّف سورة غير صالح: ${surah?.id}`);
    if (!Number.isInteger(surah?.total_verses) || surah.total_verses < 1) problems.push(`total_verses غير صالح للسورة ${surah?.id}`);
    if (ids.has(surah?.id)) problems.push(`معرّف سورة مكرر: ${surah?.id}`);
    ids.add(surah?.id);
  }
  const expectedTotal = edition.reduce((sum, surah) => sum + (Number(surah?.total_verses) || 0), 0);
  if (expectedTotal !== OPTIONS.totalAyahsExpected) {
    problems.push(`مجموع الآيات في surahs.json = ${expectedTotal} بدل ${OPTIONS.totalAyahsExpected}`);
  }
  return { problems, surahs: edition, expectedTotal };
}

function validateSurahData(surah, ayahs) {
  const problems = [];
  if (ayahs.length !== surah.total_verses) {
    problems.push(`عدد الآيات ${ayahs.length} بدل ${surah.total_verses}`);
  }
  for (let index = 0; index < ayahs.length; index += 1) {
    const expectedAya = index + 1;
    if (ayahs[index].aya !== expectedAya) {
      problems.push(`ترقيم غير متصل عند ${expectedAya} (وجد ${ayahs[index].aya})`);
      break;
    }
  }
  let leftoverTagCount = 0;
  for (const ayah of ayahs) {
    if (typeof ayah.text !== 'string') {
      problems.push(`آية ${ayah.aya}: النص ليس نصًا`);
      continue;
    }
    if (/<\/?(?:p|div|span|br|strong|em|b|i|u|h[1-6]|a|ul|ol|li|blockquote|sup|sub|table|tbody|tr|td|th|font)\b[^>]*>/i.test(ayah.text)) {
      leftoverTagCount += 1;
    }
    if (ayah.text !== ayah.text.trim()) problems.push(`فراغات طرفية في ${surah.id}:${ayah.aya}`);
  }
  if (leftoverTagCount > 0) problems.push(`${leftoverTagCount} آية فيها وسوم HTML متبقية`);
  return problems;
}

/* -------------------------------------------------------------------------- */
/*                                  الإخراج                                   */
/* -------------------------------------------------------------------------- */

function buildFilePayload(surahId, ayahs) {
  return {
    edition: {
      id: SOURCE.editionId,
      name: SOURCE.editionName,
      language: SOURCE.language,
      direction: SOURCE.direction,
    },
    surahId,
    ayahs,
  };
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/* -------------------------------------------------------------------------- */
/*                                   البرنامج                                 */
/* -------------------------------------------------------------------------- */

async function main() {
  const startedAt = Date.now();
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  توليد بيانات التفسير الميسر (Quran.com API · edition id=16)');
  console.log(`  ${SOURCE.chapterUrl('{N}')}`);
  console.log('══════════════════════════════════════════════════════════════');

  // 1) التحقق من بيانات السور المرجعية.
  const surahsRaw = await readFile(SURAHS_FILE, 'utf8');
  const { problems: editionProblems, surahs, expectedTotal } = validateEdition(JSON.parse(surahsRaw));
  if (editionProblems.length > 0) {
    console.error('✗ مشاكل في surahs.json:');
    for (const problem of editionProblems) console.error(`   - ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ surahs.json: ${surahs.length} سورة، ${expectedTotal} آية`);

  // 2) جمع البيانات سورة سورة.
  const anomalies = [];
  const fallbackDetails = [];
  const perSurah = [];
  const chapterRecordsDeclared = [];
  let totalFallback = 0;

  for (const surah of surahs) {
    const said = `${String(surah.id).padStart(3, '0')}/114`;
    let chapter;
    try {
      chapter = await fetchChapterTafsirs(surah, anomalies);
    } catch (error) {
      anomalies.push({ type: 'فشل جلب سورة', surah: surah.id, detail: error.message });
      console.error(`✗ [${said}] ${surah.name}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    if (chapter.declaredRecords !== null && chapter.declaredRecords !== surah.total_verses) {
      anomalies.push({
        type: 'اختلاف total_records',
        surah: surah.id,
        detail: `المصدر يعلن ${chapter.declaredRecords} والسور.json يعلن ${surah.total_verses}`,
      });
    }
    chapterRecordsDeclared.push({ surah: surah.id, declared: chapter.declaredRecords, verses: surah.total_verses });
    if (chapter.duplicates.length > 0) {
      anomalies.push({
        type: 'آية مكررة في استجابة الفصل',
        surah: surah.id,
        detail: chapter.duplicates.map((d) => `آية ${d.aya}`).join('، '),
      });
    }
    if (chapter.invalidKeys.length > 0) {
      anomalies.push({
        type: 'مفاتيح آيات غير صالحة',
        surah: surah.id,
        detail: chapter.invalidKeys.slice(0, 10).join('، ') + (chapter.invalidKeys.length > 10 ? '…' : ''),
      });
    }

    // فجوات by_chapter => نغطيها من by_ayah (الإصدار نفسه).
    const missing = [];
    for (let aya = 1; aya <= surah.total_verses; aya += 1) {
      if (!chapter.rawByAyah.has(aya)) missing.push(aya);
    }

    let fallbackCount = 0;
    for (const aya of missing) {
      let fallback;
      try {
        fallback = await fetchAyahTafsir(surah.id, aya);
      } catch (error) {
        anomalies.push({ type: 'فشل جلب آية احتياطيًا', surah: surah.id, aya, detail: error.message });
        await sleep(OPTIONS.requestDelayMs);
        continue;
      }
      if (fallback.resourceId !== null && fallback.resourceId !== SOURCE.editionId) {
        anomalies.push({
          type: 'إصدار تفسير احتياطي مختلف',
          surah: surah.id,
          aya,
          detail: `resource_id=${fallback.resourceId}`,
        });
      }
      if (!fallback.text || fallback.text.trim() === '') {
        anomalies.push({ type: 'نص احتياطي فارغ', surah: surah.id, aya, detail: 'by_ayah أعاد نصًا فارغًا' });
        await sleep(OPTIONS.requestDelayMs);
        continue;
      }
      chapter.rawByAyah.set(aya, fallback.text);
      fallbackCount += 1;
      totalFallback += 1;
      await sleep(OPTIONS.requestDelayMs);
    }
    if (missing.length > 0) {
      fallbackDetails.push({ surah: surah.id, surahName: surah.name, missing, filled: fallbackCount });
    }

    // تنظيف النصوص وترتيب الآيات 1..n.
    const ayahs = [];
    const emptyTexts = [];
    for (let aya = 1; aya <= surah.total_verses; aya += 1) {
      const rawText = chapter.rawByAyah.get(aya) ?? '';
      const cleanText = htmlToText(rawText);
      if (cleanText === '') emptyTexts.push(aya);
      ayahs.push({ aya, text: cleanText });
    }
    if (emptyTexts.length > 0) {
      anomalies.push({ type: 'نص فارغ بعد التنظيف', surah: surah.id, detail: emptyTexts.join('، ') });
    }
    const surahProblems = validateSurahData(surah, ayahs);
    if (surahProblems.length > 0) {
      anomalies.push({ type: 'تحقق بنية السورة', surah: surah.id, detail: surahProblems.join(' · ') });
    }

    // نصوص متطابقة لآيات متجاورة = تفسير مُجمَّع من المصدر (معلومة لا خطأ).
    let groupedRuns = 0;
    let groupedAyahs = 0;
    for (let index = 1; index < ayahs.length; index += 1) {
      if (ayahs[index].text !== '' && ayahs[index].text === ayahs[index - 1].text) {
        if (index === 1 || ayahs[index - 2].text !== ayahs[index].text) groupedRuns += 1;
        groupedAyahs += 1;
      }
    }
    if (groupedAyahs > 0) {
      anomalies.push({
        type: 'تفسير مُجمَّع (نص مشترك)',
        surah: surah.id,
        detail: `${groupedAyahs} آية ضمن ${groupedRuns} مجموعة`,
        severity: 'info',
      });
    }

    const payload = buildFilePayload(surah.id, ayahs);
    const content = `${JSON.stringify(payload, null, 2)}\n`;
    const bytes = Buffer.byteLength(content, 'utf8');
    perSurah.push({
      surahId: surah.id,
      surahName: surah.name,
      ayahs: ayahs.length,
      bytes,
      fallback: fallbackCount,
      groupedAyahs,
      emptyAyahs: emptyTexts,
      payload: content,
    });

    console.log(
      `✓ [${said}] ${surah.name.padEnd(12, ' ')} ${String(ayahs.length).padStart(3, ' ')}/${surah.total_verses} آية` +
        ` · by_chapter ${chapter.rawByAyah.size - fallbackCount} · احتياطي ${fallbackCount}` +
        ` · ${formatKb(bytes)}`,
    );
  }

  // 3) التحقق النهائي قبل الكتابة.
  const validation = [];
  for (const entry of perSurah) {
    const surah = surahs.find((item) => item.id === entry.surahId);
    if (!surah) {
      validation.push(`السورة ${entry.surahId} غير موجودة في surahs.json`);
      continue;
    }
    if (entry.ayahs !== surah.total_verses) {
      validation.push(`السورة ${surah.id}: عدد الآيات ${entry.ayahs} بدل ${surah.total_verses}`);
    }
    if (entry.emptyAyahs.length > 0) {
      validation.push(`السورة ${surah.id}: ${entry.emptyAyahs.length} آية بنص فارغ`);
    }
  }
  const totalAyahs = perSurah.reduce((sum, entry) => sum + entry.ayahs, 0);
  if (perSurah.length !== surahs.length) {
    validation.push(`عدد الملفات ${perSurah.length} بدل ${surahs.length}`);
  }
  if (totalAyahs !== expectedTotal) {
    validation.push(`الإجمالي ${totalAyahs} بدل ${expectedTotal}`);
  }
  const fatalAnomalies = anomalies.filter((item) => item.severity !== 'info');
  for (const anomaly of fatalAnomalies) {
    validation.push(`[${anomaly.type}] السورة ${anomaly.surah}: ${anomaly.detail}`);
  }
  if (validation.length > 0) {
    console.error('\n✗ فشل التحقق — لم تُكتب الملفات:');
    for (const problem of validation) console.error(`   - ${problem}`);
    const failing = anomalies.filter((item) => item.severity !== 'info');
    if (failing.length > 0) {
      console.error('  الشذوذ المكتشف (فشل):');
      for (const anomaly of failing) console.error(`   - [${anomaly.type}] ${anomaly.surah}${anomaly.aya ? `:${anomaly.aya}` : ''}: ${anomaly.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  // 4) الكتابة على القرص بعد نجاح التحقق.
  await mkdir(OUT_DIR, { recursive: true });
  for (const entry of perSurah) {
    await writeFile(path.join(OUT_DIR, `${entry.surahId}.json`), entry.payload, 'utf8');
  }

  // 5) الملخص النهائي.
  const totalBytes = perSurah.reduce((sum, entry) => sum + entry.bytes, 0);
  const largest = perSurah.reduce((max, entry) => (entry.bytes > max.bytes ? entry : max), perSurah[0]);
  const smallest = perSurah.reduce((min, entry) => (entry.bytes < min.bytes ? entry : min), perSurah[0]);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  const samples = await readSamples();

  console.log('\n────────────────────────────── الملخص ──────────────────────────────');
  console.log(`  الملفات المكتوبة        : ${perSurah.length} ملفًا في public/assets/data/tafsir/muyassar/`);
  console.log(`  مجموع الآيات            : ${totalAyahs}`);
  console.log(`  الحجم الكلي             : ${formatKb(totalBytes)} (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  أكبر ملف                : ${largest.surahId}.json (${largest.surahName}) — ${formatKb(largest.bytes)}`);
  console.log(`  أصغر ملف                : ${smallest.surahId}.json (${smallest.surahName}) — ${formatKb(smallest.bytes)}`);
  console.log(`  متوسط حجم الملف         : ${formatKb(totalBytes / perSurah.length)}`);
  console.log(`  زمن التنفيذ             : ${elapsed} ثانية`);
  console.log(`  آيات عُوّضت عبر by_ayah  : ${totalFallback}${fallbackDetails.length === 0 ? ' (لا فجوات)' : ` في ${fallbackDetails.length} سورة`}`);
  console.log(`  التحقق                  : ✓ نجح (${expectedTotal} آية، ${perSurah.length} سورة، لا نص فارغ، ترقيم متصل 1..n)`);
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log(`  عينة 1:1  : ${samples['1:1']}`);
  console.log(`  عينة 2:255: ${samples['2:255']}`);
  console.log('─────────────────────────────────────────────────────────────────────');

  if (fallbackDetails.length > 0) {
    console.log('  فجوات المصدر (by_chapter) المعوّضة:');
    for (const item of fallbackDetails) {
      console.log(`   - السورة ${item.surah} (${item.surahName}): ${item.missing.length} آية [${item.missing.join('، ')}] → عُوّضت ${item.filled}`);
    }
  }
  const infoAnomalies = anomalies.filter((item) => item.severity === 'info');
  if (infoAnomalies.length > 0) {
    const groupedTotal = infoAnomalies.reduce((sum, item) => sum + Number((item.detail.match(/^(\d+)/) ?? [0, 0])[1]), 0);
    console.log(`  تفسير مُجمَّع (نص آية مشترك مع سابقتها): ${groupedTotal} آية في ${infoAnomalies.length} سورة — سلوك مصدر طبيعي.`);
  }
  console.log('══════════════════════════════════════════════════════════════');
}

async function readSamples() {
  const samples = {};
  try {
    const surah1 = JSON.parse(await readFile(path.join(OUT_DIR, '1.json'), 'utf8'));
    const surah2 = JSON.parse(await readFile(path.join(OUT_DIR, '2.json'), 'utf8'));
    samples['1:1'] = surah1.ayahs[0]?.text ?? '(غير متوفر)';
    const aya255 = surah2.ayahs.find((item) => item.aya === 255);
    samples['2:255'] = aya255 ? `${aya255.text.slice(0, 300)}${aya255.text.length > 300 ? '…' : ''}` : '(غير متوفر)';
  } catch (error) {
    samples['1:1'] = `(تعذّر القراءة: ${error.message})`;
    samples['2:255'] = samples['1:1'];
  }
  return samples;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error('\n✗ خطأ غير متوقع:', error?.stack ?? error);
    process.exitCode = 1;
  });
}

export { htmlToText, validateEdition };
