# quran.com.ly — Content API (واجهة البيانات الثابتة)

موقع [quran.com.ly](https://quran.com.ly) يوفّر بياناته كملفات **JSON ثابتة** قابلة للاستخدام مباشرة من أي تطبيق (ويب، جوال، سكربتات) دون مفاتيح API ولا حدود طلبات.

## المبادئ

- **ثابتة ومفتوحة**: كل نقطة نهاية هي ملف JSON يُخدم عبر CDN.
- **CORS مفعّل**: رؤوس `Access-Control-Allow-Origin: *` على مسار `/assets/data/*` (انظر `public/_headers`).
- **كاش**: `Cache-Control: public, max-age=86400` على البيانات.
- **بدون كتابة**: الواجهة للقراءة فقط (GET/HEAD).

## نقاط النهاية

### 1) فهرس السور

```
GET https://quran.com.ly/assets/data/surahs.json
```

يعيد مصفوفة من ١١٤ عنصرًا:

```json
[
  {
    "id": 1,
    "name": "الفاتحة",
    "transliteration": "Al-Fatihah",
    "type": "meccan",
    "total_verses": 7
  }
]
```

### 2) كل الآيات في مصفوفة واحدة

```
GET https://quran.com.ly/assets/data/quran.json
```

يعيد ٦٢٣٦ عنصرًا بالشكل:

```json
[{ "sura": 1, "aya": 1, "text": "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ" }]
```

### 3) الآيات مقسّمة حسب السور

```
GET https://quran.com.ly/assets/data/quran-by-surah.json
```

يعيد مصفوفة كل عنصر فيها بيانات السورة + آياتها:

```json
[
  {
    "id": 2,
    "name": "البقرة",
    "transliteration": "Al-Baqarah",
    "type": "medinan",
    "total_verses": 286,
    "verses": [{ "sura": 2, "aya": 1, "text": "الٓمٓ" }]
  }
]
```

### 4) ملف سورة منفردة

```
GET https://quran.com.ly/assets/data/surahs/2.json
```

### 5) الترجمة الإنجليزية (Saheeh International)

```
GET https://quran.com.ly/assets/data/translations/en-sahih-international/{1..114}.json
```

```json
{
  "edition": { "id": 20, "name": "Saheeh International", "language": "en", "direction": "ltr" },
  "surahId": 2,
  "ayahs": [{ "aya": 1, "text": "Alif, Lām, Meem." }]
}
```

### 6) التفسير الميسر (عربي)

```
GET https://quran.com.ly/assets/data/tafsir/muyassar/{1..114}.json
```

### 7) كلمة بكلمة (المعنى الإنجليزي + النقل الصوتي)

```
GET https://quran.com.ly/assets/data/words/{1..114}.json
```

```json
{
  "surahId": 1,
  "language": "en",
  "words": [
    {
      "aya": 1,
      "entries": [
        { "position": 1, "text": "بِسْمِ", "translation": "In (the) name", "transliteration": "bis'mi" }
      ]
    }
  ]
}
```

### 8) الصوت (آية بآية)

ملفات التلاوة تُبث من شبكة إسلامية خارجية بنمط:

```
https://cdn.islamic.network/quran/audio/{bitrate}/{reciterId}/{globalAyahNumber}.mp3
```

حيث `globalAyahNumber` هو ترقيم الآية العام من ١ إلى ٦٢٣٦ (يُحسب بجمع `total_verses` للسور السابقة)، ومعرّفات القرّاء موجودة في `src/utils/reciters.ts` (مثل `ar.alafasy`). مثال: البقرة ٢٥٥ = `.../128/ar.alafasy/262.mp3`.

### 9) خرائط الموقع

```
GET https://quran.com.ly/sitemap.xml           # فهرس خرائط مقسّم
GET https://quran.com.ly/sitemaps/surahs.xml   # صفحات السور
GET https://quran.com.ly/sitemaps/ayahs-1.xml  # صفحات الآيات (مقسّمة)
```

## مثال استخدام (JavaScript)

```js
const surahs = await fetch('https://quran.com.ly/assets/data/surahs.json').then((r) => r.json());
const alBaqarah = await fetch('https://quran.com.ly/assets/data/surahs/2.json').then((r) => r.json());
console.log(alBaqarah.verses[0].text); // الٓمٓ
```

## مثال فلترة الآيات

```js
const all = await fetch('https://quran.com.ly/assets/data/quran.json').then((r) => r.json());
const ayatAlKursi = all.filter((v) => v.sura === 2 && v.aya === 255);
```

## التراخيص والإسناد

- **نص القرآن**: بيانات [quran-json](https://github.com/risan/quran-json) (رخصة CC BY 4.0) — مع الإسناد.
- **الترجمة والتفسير والكلمة-بكلمة**: عبر [Quran.com API](https://api.quran.com/) — يُراعى الإسناد وحقوق الناشرين عند إعادة الاستخدام.
- **شيفرة المشروع**: رخصة MIT (انظر `LICENSE`).

> الواجهة ثابتة ولا تتطلب تسجيلًا. يرجى عدم إغراق CDN بطلبات عشوائية، واستخدم الكاش المحلي عند التطبيقات كثيفة الاستخدام.
