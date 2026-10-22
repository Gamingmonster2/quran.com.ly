import fs from 'node:fs';
import path from 'node:path';

async function fetchAndGenerate() {
  console.log('Fetching quran-json data from open-source repository...');
  const res = await fetch('https://unpkg.com/quran-json@3.1.2/dist/quran.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch quran.json: ${res.statusText}`);
  }
  const surahsData = await res.json();
  console.log(`Fetched ${surahsData.length} surahs.`);

  // 1. Comprehensive list of all verses with exact requested schema:
  // sura: رقم السورة (1 - 114)
  // aya: رقم الآية
  // text: النص القرآني بالرسم العثماني (Uthmani Text)
  const allVerses = [];
  const surahsIndex = [];
  const bySurahList = [];

  for (const surah of surahsData) {
    const suraNum = surah.id;
    const surahVerses = [];

    for (const v of surah.verses) {
      const verseObj = {
        sura: suraNum,
        aya: v.id,
        text: v.text.trim()
      };
      allVerses.push(verseObj);
      surahVerses.push(verseObj);
    }

    surahsIndex.push({
      id: surah.id,
      name: surah.name,
      transliteration: surah.transliteration,
      type: surah.type,
      total_verses: surah.total_verses
    });

    bySurahList.push({
      id: surah.id,
      name: surah.name,
      transliteration: surah.transliteration,
      type: surah.type,
      total_verses: surah.total_verses,
      verses: surahVerses
    });
  }

  console.log(`Total verses processed: ${allVerses.length}`);

  const targetDirs = [
    path.resolve('assets/data'),
    path.resolve('public/assets/data'),
    path.resolve('src/assets/data')
  ];

  for (const dir of targetDirs) {
    fs.mkdirSync(dir, { recursive: true });
    const surahsDir = path.join(dir, 'surahs');
    fs.mkdirSync(surahsDir, { recursive: true });

    // 1. Comprehensive quran.json (array of all verses matching exact requested structure)
    fs.writeFileSync(
      path.join(dir, 'quran.json'),
      JSON.stringify(allVerses, null, 2),
      'utf-8'
    );

    // 2. Comprehensive quran-by-surah.json (divided by surahs with surah metadata & verses)
    fs.writeFileSync(
      path.join(dir, 'quran-by-surah.json'),
      JSON.stringify(bySurahList, null, 2),
      'utf-8'
    );

    // 3. Surahs metadata index
    fs.writeFileSync(
      path.join(dir, 'surahs.json'),
      JSON.stringify(surahsIndex, null, 2),
      'utf-8'
    );

    // 4. Individual surah files
    for (const surah of bySurahList) {
      fs.writeFileSync(
        path.join(surahsDir, `${surah.id}.json`),
        JSON.stringify(surah, null, 2),
        'utf-8'
      );
    }
  }

  console.log('Successfully generated Quran datasets across assets directories:');
  console.log('- assets/data/quran.json');
  console.log('- assets/data/quran-by-surah.json');
  console.log('- assets/data/surahs.json');
  console.log('- assets/data/surahs/[1-114].json');
  console.log('- public/assets/data/...');
  console.log('- src/assets/data/...');
}

fetchAndGenerate().catch((err) => {
  console.error(err);
  process.exit(1);
});
