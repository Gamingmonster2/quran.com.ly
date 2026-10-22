import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Ayah, SurahMeta, SurahWithVerses, Bookmark, ViewMode, ReadingDisplayMode, QuranFontChoice, ThemeMode } from './types/quran.ts';
import { Header } from './components/Header.tsx';
import { SurahList } from './components/SurahList.tsx';
import { ReaderView } from './components/ReaderView.tsx';
import { SearchView } from './components/SearchView.tsx';
import { BookmarksView } from './components/BookmarksView.tsx';
import { DataInspectorModal } from './components/DataInspectorModal.tsx';
import { AudioPlayerBar } from './components/AudioPlayerBar.tsx';
import AboutPage from './pages/AboutPage.tsx';
import SourcesPage from './pages/SourcesPage.tsx';
import ContactPage from './pages/ContactPage.tsx';
import {
  Route,
  isStaticPageRoute,
  parseLocation,
  routeToAbsoluteUrl,
  routeToPath,
  routeToView,
} from './router.ts';
import {
  applyPageSeo,
  buildSurahJsonLd,
  buildWebPageJsonLd,
} from './utils/seo.ts';
import {
  computeAyahOffsets,
  getAyahAudioUrls,
  getGlobalAyahNumber,
  toArabicDigits,
} from './utils/quranHelpers.ts';
import { DEFAULT_RECITER_ID, RECITERS, getReciter } from './utils/reciters.ts';

const THEME_STORAGE_KEY = 'quran_theme';
const RECITER_STORAGE_KEY = 'quran_reciter';
const TRANSLATION_PREF_KEY = 'quran_show_translation';
const TAFSIR_PREF_KEY = 'quran_show_tafsir';
const WORDS_PREF_KEY = 'quran_show_words';

const INITIAL_ROUTE: Route = parseLocation(window.location.pathname);
const INITIAL_SURAH_ID =
  INITIAL_ROUTE.name === 'surah' ? INITIAL_ROUTE.surahId : 1;

const HOME_TITLE = 'القرآن الكريم بالرسم العثماني — مصحف إلكتروني وتلاوات | quran.com.ly';
const HOME_DESCRIPTION =
  'مصحف إلكتروني شامل وقاعدة بيانات مفتوحة المصدر للقرآن الكريم بالرسم العثماني على quran.com.ly: تلاوات صوتية بأصوات نخبة من القرّاء آية بآية، بحث فوري في ٦٢٣٦ آية بدون تشكيل، فهرس السور، أوضاع قراءة ليلية وبيج مريحة للعين، وتنزيل بيانات JSON.';

export default function App() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [allVerses, setAllVerses] = useState<Ayah[]>([]);
  const [bySurahMap, setBySurahMap] = useState<Map<number, SurahWithVerses>>(new Map());
  const [route, setRoute] = useState<Route>(INITIAL_ROUTE);
  const [selectedSurahId, setSelectedSurahId] = useState<number>(INITIAL_SURAH_ID);
  const [displayMode, setDisplayMode] = useState<ReadingDisplayMode>('verses');
  const [fontSize, setFontSize] = useState<number>(26);
  const [fontChoice, setFontChoice] = useState<QuranFontChoice>('uthman-taha');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // المظهر: الوضع الليلي افتراضي، والوضع البيج المريح للعين بديل
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'beige' ? 'beige' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // القارئ المختار للتلاوة الصوتية
  const [reciterId, setReciterId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(RECITER_STORAGE_KEY);
      return saved && RECITERS.some((reciter) => reciter.id === saved)
        ? saved
        : DEFAULT_RECITER_ID;
    } catch {
      return DEFAULT_RECITER_ID;
    }
  });
  const [audioError, setAudioError] = useState<string | null>(null);

  // تفضيلات المحتوى الإضافي: ترجمة / تفسير / كلمة بكلمة (محفوظة في المتصفح)
  const [showTranslation, setShowTranslation] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TRANSLATION_PREF_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showTafsir, setShowTafsir] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TAFSIR_PREF_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showWordByWord, setShowWordByWord] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WORDS_PREF_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Audio Playback State
  const [playingAyah, setPlayingAyah] = useState<Ayah | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<boolean>(false);

  // عنصر صوت واحد يُنشأ مرة واحدة فقط حتى لا تتوقف التلاوة عند تغيّر الحالة
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (audioRef.current === null) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }
  const audioCandidatesRef = useRef<string[]>([]);
  const audioCandidateIndexRef = useRef<number>(0);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem('quran_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);

  /**
   * ينقل المستخدم إلى مسار جديد ويحدّث سجل المتصفح (History API).
   * كل التنقل داخل الموقع يمر من هنا.
   */
  const navigate = useCallback((next: Route, options: { replace?: boolean } = {}) => {
    const nextPath = routeToPath(next);
    if (window.location.pathname !== nextPath) {
      if (options.replace) {
        window.history.replaceState(null, '', nextPath);
      } else {
        window.history.pushState(null, '', nextPath);
      }
    }
    setRoute(next);
    if (next.name === 'surah') {
      setSelectedSurahId(next.surahId);
    }
  }, []);

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // مزامنة مسار المتصفح مع الحالة (زر الرجوع/التقدم)
  useEffect(() => {
    const handlePopState = () => {
      const next = parseLocation(window.location.pathname);
      setRoute(next);
      if (next.name === 'surah') setSelectedSurahId(next.surahId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load Quran Datasets from public/assets/data/
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [surahsRes, versesRes, bySurahRes] = await Promise.all([
          fetch('/assets/data/surahs.json'),
          fetch('/assets/data/quran.json'),
          fetch('/assets/data/quran-by-surah.json'),
        ]);

        if (!surahsRes.ok || !versesRes.ok) {
          throw new Error('فشل تحميل ملفات بيانات القرآن الكريم من assets/data/');
        }

        const surahsData: SurahMeta[] = await surahsRes.json();
        const versesData: Ayah[] = await versesRes.json();
        const bySurahData: SurahWithVerses[] = await bySurahRes.json();

        setSurahs(surahsData);
        setAllVerses(versesData);

        const map = new Map<number, SurahWithVerses>();
        bySurahData.forEach((s) => map.set(s.id, s));
        setBySurahMap(map);

        setIsLoading(false);
      } catch (err: any) {
        console.error(err);
        setLoadError(err.message || 'حدث خطأ أثناء تحميل البيانات');
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // رقم الآية العام في المصحف (1..6236) اللازم لملفات التلاوة الصوتية
  const ayahOffsets = useMemo(() => computeAyahOffsets(surahs), [surahs]);

  // حالة الصوت الحالية في مرجع حتى تصل إليها مستمعات عنصر الصوت الأصيلة
  const audioStateRef = useRef({
    playingAyah,
    repeatMode,
    bySurahMap,
    reciterId,
    ayahOffsets,
  });
  useEffect(() => {
    audioStateRef.current = { playingAyah, repeatMode, bySurahMap, reciterId, ayahOffsets };
  }, [playingAyah, repeatMode, bySurahMap, reciterId, ayahOffsets]);

  // تطبيق السمة على الصفحة وحفظها
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#0e1110' : '#f7f1e3');
    }
  }, [theme]);

  // حفظ القارئ المختار
  useEffect(() => {
    try {
      localStorage.setItem(RECITER_STORAGE_KEY, reciterId);
    } catch {
      /* ignore */
    }
  }, [reciterId]);

  // حفظ تفضيلات المحتوى الإضافي
  useEffect(() => {
    try {
      localStorage.setItem(TRANSLATION_PREF_KEY, showTranslation ? '1' : '0');
      localStorage.setItem(TAFSIR_PREF_KEY, showTafsir ? '1' : '0');
      localStorage.setItem(WORDS_PREF_KEY, showWordByWord ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [showTranslation, showTafsir, showWordByWord]);

  // Sync bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('quran_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.warn('Could not save bookmarks to localStorage', e);
    }
  }, [bookmarks]);

  /**
   * تحميل صوت آية معيّنة وتشغيلها.
   * يجرب الجودة الأعلى أولاً ثم يتراجع للجودة الأقل عبر مستمع الخطأ.
   */
  const loadAyahAudio = (ayah: Ayah, reciter = getReciter(reciterId), autoplay = true) => {
    const audio = audioRef.current;
    if (!audio) return;

    const globalAyahNumber = getGlobalAyahNumber(ayah.sura, ayah.aya, ayahOffsets);
    const urls = getAyahAudioUrls(reciter, globalAyahNumber);

    audioCandidatesRef.current = urls;
    audioCandidateIndexRef.current = 0;
    setAudioError(null);

    audio.src = urls[0];
    audio.load();
    if (autoplay) {
      audio.play().catch((err: unknown) => {
        if ((err as DOMException)?.name !== 'AbortError') {
          console.warn('Audio play request interrupted or blocked:', err);
        }
      });
    }
  };

  // ربط عنصر الصوت بالمستمعات مرة واحدة فقط (لا يُعاد إنشاء العنصر)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const playCandidate = (index: number) => {
      const urls = audioCandidatesRef.current;
      if (index >= urls.length) return false;
      audioCandidateIndexRef.current = index;
      audio.src = urls[index];
      audio.load();
      audio.play().catch(() => {
        /* الخطأ يعالجه مستمع error */
      });
      return true;
    };

    const advanceToNextAyah = (current: Ayah) => {
      const state = audioStateRef.current;
      const currentSurahObj = state.bySurahMap.get(current.sura);
      let nextAyah: Ayah | null = null;

      if (currentSurahObj && current.aya < currentSurahObj.total_verses) {
        nextAyah = currentSurahObj.verses.find((verse) => verse.aya === current.aya + 1) ?? null;
      } else if (current.sura < 114) {
        const nextSurahObj = state.bySurahMap.get(current.sura + 1);
        if (nextSurahObj && nextSurahObj.verses.length > 0) {
          nextAyah = nextSurahObj.verses[0];
        }
      }

      if (!nextAyah) {
        setIsPlaying(false);
        setPlayingAyah(null);
        return;
      }

      if (nextAyah.sura !== state.playingAyah?.sura) {
        setSelectedSurahId(nextAyah.sura);
        navigateRef.current({ name: 'surah', surahId: nextAyah.sura });
      }
      setPlayingAyah(nextAyah);

      const reciter = getReciter(state.reciterId);
      const globalAyahNumber = getGlobalAyahNumber(
        nextAyah.sura,
        nextAyah.aya,
        state.ayahOffsets
      );
      audioCandidatesRef.current = getAyahAudioUrls(reciter, globalAyahNumber);
      audioCandidateIndexRef.current = 0;
      setAudioError(null);
      playCandidate(0);
    };

    const handleEnded = () => {
      const state = audioStateRef.current;
      const current = state.playingAyah;
      if (!current) {
        setIsPlaying(false);
        return;
      }
      if (state.repeatMode) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          /* ignore */
        });
        return;
      }
      advanceToNextAyah(current);
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    const handleError = () => {
      const urls = audioCandidatesRef.current;
      const nextIndex = audioCandidateIndexRef.current + 1;
      if (nextIndex < urls.length) {
        if (playCandidate(nextIndex)) return;
      }
      setIsPlaying(false);
      setAudioError('تعذّر تشغيل التلاوة الصوتية. جرّب قارئاً آخر أو تحقّق من اتصال الإنترنت.');
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const currentSurah = bySurahMap.get(selectedSurahId) || null;
  const currentPlayingSurahMeta = playingAyah
    ? surahs.find((s) => s.id === playingAyah.sura) || null
    : null;
  const currentReciter = getReciter(reciterId);
  const currentView: ViewMode | null = routeToView(route);

  // ------- تحديث بيانات SEO والبيانات المنظمة عند كل تنقل -------
  useEffect(() => {
    const path = routeToPath(route);

    if (route.name === 'surah') {
      const surahFull = bySurahMap.get(route.surahId);
      const surah = surahFull ?? surahs.find((s) => s.id === route.surahId);
      const isHome = path === '/';

      if (!surah) {
        applyPageSeo({
          title: HOME_TITLE,
          description: HOME_DESCRIPTION,
          route,
        });
        return;
      }

      if (isHome) {
        applyPageSeo({
          title: HOME_TITLE,
          description: HOME_DESCRIPTION,
          route,
          jsonLd: buildSurahJsonLd({ surah, url: routeToAbsoluteUrl(route) }),
        });
        return;
      }

      const surahType = surah.type === 'meccan' ? 'مكية' : 'مدنية';
      const url = routeToAbsoluteUrl(route);

      if (route.ayahId) {
        const ayah = surahFull?.verses?.find(
          (verse: Ayah) => verse.aya === route.ayahId
        );
        const ayahText = ayah?.text ?? '';
        const snippet = ayahText.length > 120 ? `${ayahText.slice(0, 120)}…` : ayahText;
        applyPageSeo({
          title: `سورة ${surah.name} — الآية ${toArabicDigits(route.ayahId)} | القرآن الكريم بالرسم العثماني`,
          description: snippet
            ? `${snippet} — اقرأ الآية ${toArabicDigits(route.ayahId)} من سورة ${surah.name} بالرسم العثماني واستمع لها آية بآية على quran.com.ly.`
            : `الآية ${toArabicDigits(route.ayahId)} من سورة ${surah.name} بالرسم العثماني على quran.com.ly.`,
          route,
          jsonLd: buildSurahJsonLd({
            surah,
            url,
            ayahNumber: route.ayahId,
            ayahText,
          }),
        });
      } else {
        applyPageSeo({
          title: `سورة ${surah.name} — القرآن الكريم بالرسم العثماني | quran.com.ly`,
          description: `سورة ${surah.name} (${surah.transliteration}) — سورة ${surahType}، عدد آياتها ${toArabicDigits(surah.total_verses)} آية بالرسم العثماني. اقرأها واستمع إليها آية بآية بأصوات نخبة من القرّاء على quran.com.ly.`,
          route,
          jsonLd: buildSurahJsonLd({ surah, url }),
        });
      }
      return;
    }

    if (route.name === 'search') {
      applyPageSeo({
        title: 'البحث في آيات القرآن الكريم | quran.com.ly',
        description:
          'ابحث فورًا في آيات القرآن الكريم الـ٦٢٣٦ بالرسم العثماني، دون الحاجة إلى كتابة التشكيل، مع إمكانية الانتقال إلى الآية أو سماع تلاوتها.',
        route,
        robots: 'noindex, follow',
        jsonLd: buildWebPageJsonLd('البحث في الآيات', 'بحث فوري في آيات القرآن الكريم.', route),
      });
      return;
    }

    if (route.name === 'bookmarks') {
      applyPageSeo({
        title: 'العلامات المحفوظة | quran.com.ly',
        description: 'آياتك المحفوظة في القرآن الكريم للرجوع إليها لاحقًا، محفوظة محليًا في متصفحك.',
        route,
        robots: 'noindex, follow',
      });
      return;
    }

    if (route.name === 'data') {
      applyPageSeo({
        title: 'مستودع بيانات القرآن الكريم (JSON) | quran.com.ly',
        description:
          'تنزيل بيانات القرآن الكريم كاملة بالرسم العثماني بصيغة JSON (quran.json وquran-by-surah.json) مع هيكلية موثقة وأمثلة استخدام.',
        route,
        jsonLd: buildWebPageJsonLd(
          'مستودع بيانات القرآن الكريم',
          'بيانات القرآن الكريم كاملة بصيغة JSON مفتوحة المصدر.',
          route
        ),
      });
      return;
    }

    if (route.name === 'about') {
      const title = 'عن المشروع | quran.com.ly';
      const description =
        'عن موقع quran.com.ly: قصة المشروع، صاحب المشروع، التقنيات المستخدمة، ترخيص MIT، وكيفية استمرار تطوير هذا المصحف الإلكتروني.';
      applyPageSeo({ title, description, route, jsonLd: buildWebPageJsonLd(title, description, route) });
      return;
    }

    if (route.name === 'sources') {
      const title = 'المصادر والتراخيص | quran.com.ly';
      const description =
        'مصادر بيانات القرآن الكريم في quran.com.ly: نص quran-json بالرسم العثماني، تلاوات islamic.network، الخطوط والتراخيص.';
      applyPageSeo({ title, description, route, jsonLd: buildWebPageJsonLd(title, description, route) });
      return;
    }

    if (route.name === 'contact') {
      const title = 'تواصل معنا | quran.com.ly';
      const description = 'طرق التواصل مع فريق quran.com.ly عبر مستودع المشروع على GitHub ومسائل المشروع.';
      applyPageSeo({ title, description, route, jsonLd: buildWebPageJsonLd(title, description, route) });
      return;
    }

    applyPageSeo({
      title: 'الصفحة غير موجودة | quran.com.ly',
      description: 'الصفحة التي تبحث عنها غير موجودة. عد إلى فهرس السور لاستكشاف القرآن الكريم.',
      route,
      robots: 'noindex, follow',
    });
  }, [route, surahs, bySurahMap]);

  // ------- التمرير تلقائيًا إلى آية محددة في الرابط -------
  useEffect(() => {
    if (route.name !== 'surah' || !route.ayahId || isLoading) return;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(
        `ayah-${route.surahId}-${route.ayahId}`
      );
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [route, isLoading, bySurahMap]);

  const handleSelectView = (view: ViewMode) => {
    switch (view) {
      case 'surah':
        navigate({ name: 'surah', surahId: selectedSurahId });
        break;
      case 'search':
        navigate({ name: 'search' });
        break;
      case 'bookmarks':
        navigate({ name: 'bookmarks' });
        break;
      case 'data':
        navigate({ name: 'data' });
        break;
    }
  };

  const handleSelectSurah = (id: number) => {
    navigate({ name: 'surah', surahId: id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAyah = (suraId: number, ayaNum: number) => {
    navigate({ name: 'surah', surahId: suraId, ayahId: ayaNum });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayAyah = (ayah: Ayah) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (
      isPlaying &&
      playingAyah?.sura === ayah.sura &&
      playingAyah?.aya === ayah.aya
    ) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setPlayingAyah(ayah);
      loadAyahAudio(ayah);
      setIsPlaying(true);
    }
  };

  const handlePlayEntireSurah = () => {
    const currentSurahObj = bySurahMap.get(selectedSurahId);
    if (!currentSurahObj || currentSurahObj.verses.length === 0) return;

    if (isPlaying && playingAyah?.sura === selectedSurahId) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const firstAyah = currentSurahObj.verses[0];
      setPlayingAyah(firstAyah);
      loadAyahAudio(firstAyah);
      setIsPlaying(true);
    }
  };

  const handleNextAyah = () => {
    if (!playingAyah) return;
    const currentSurahObj = bySurahMap.get(playingAyah.sura);
    if (!currentSurahObj) return;

    let nextAyah: Ayah | null = null;
    if (playingAyah.aya < currentSurahObj.total_verses) {
      nextAyah = currentSurahObj.verses.find((v) => v.aya === playingAyah.aya + 1) ?? null;
    } else if (playingAyah.sura < 114) {
      const nextSurahObj = bySurahMap.get(playingAyah.sura + 1);
      if (nextSurahObj && nextSurahObj.verses.length > 0) {
        nextAyah = nextSurahObj.verses[0];
      }
    }

    if (nextAyah) {
      setPlayingAyah(nextAyah);
      if (nextAyah.sura !== playingAyah.sura) {
        navigate({ name: 'surah', surahId: nextAyah.sura });
      }
      loadAyahAudio(nextAyah);
      setIsPlaying(true);
    }
  };

  const handlePrevAyah = () => {
    if (!playingAyah) return;
    const currentSurahObj = bySurahMap.get(playingAyah.sura);
    if (!currentSurahObj) return;

    let prevAyah: Ayah | null = null;
    if (playingAyah.aya > 1) {
      prevAyah = currentSurahObj.verses.find((v) => v.aya === playingAyah.aya - 1) ?? null;
    } else if (playingAyah.sura > 1) {
      const prevSurahObj = bySurahMap.get(playingAyah.sura - 1);
      if (prevSurahObj && prevSurahObj.verses.length > 0) {
        prevAyah = prevSurahObj.verses[prevSurahObj.verses.length - 1];
      }
    }

    if (prevAyah) {
      setPlayingAyah(prevAyah);
      if (prevAyah.sura !== playingAyah.sura) {
        navigate({ name: 'surah', surahId: prevAyah.sura });
      }
      loadAyahAudio(prevAyah);
      setIsPlaying(true);
    }
  };

  const handleSelectReciter = (id: string) => {
    setReciterId(id);
    if (playingAyah) {
      loadAyahAudio(playingAyah, getReciter(id), isPlaying);
    }
  };

  const handleToggleBookmark = (ayah: Ayah) => {
    const surahObj = bySurahMap.get(ayah.sura);
    const surahName = surahObj ? surahObj.name : '';

    setBookmarks((prev) => {
      const exists = prev.some((b) => b.sura === ayah.sura && b.aya === ayah.aya);
      if (exists) {
        return prev.filter((b) => !(b.sura === ayah.sura && b.aya === ayah.aya));
      } else {
        return [
          {
            sura: ayah.sura,
            aya: ayah.aya,
            surahName,
            previewText: ayah.text,
            timestamp: Date.now(),
          },
          ...prev,
        ];
      }
    });
  };

  const bookmarkedAyahsSet = useMemo(() => {
    return new Set(bookmarks.map((b) => `${b.sura}:${b.aya}`));
  }, [bookmarks]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-stone-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Header
        currentView={currentView}
        onSelectView={handleSelectView}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        theme={theme}
        onSelectTheme={setTheme}
        onNavigateHome={() => navigate({ name: 'surah', surahId: 1 })}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {isStaticPageRoute(route) ? (
          <>
            {/* الصفحات التعريفية لا تحتاج بيانات القرآن فلا ينتظرها سبينر التحميل */}
            {route.name === 'about' && <AboutPage />}
            {route.name === 'sources' && <SourcesPage />}
            {route.name === 'contact' && <ContactPage />}
          </>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-10 h-10 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
            <p className="font-quran text-lg text-stone-700">
              جاري تحميل بيانات القرآن الكريم بالرسم العثماني...
            </p>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <p className="text-red-700 font-medium">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {route.name === 'surah' && currentSurah && (
              <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden">
                <SurahList
                  surahs={surahs}
                  selectedSurahId={selectedSurahId}
                  onSelectSurah={handleSelectSurah}
                />

                <ReaderView
                  surah={currentSurah}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  fontChoice={fontChoice}
                  setFontChoice={setFontChoice}
                  displayMode={displayMode}
                  setDisplayMode={setDisplayMode}
                  playingAyah={playingAyah}
                  isPlaying={isPlaying}
                  bookmarkedAyahs={bookmarkedAyahsSet}
                  onPlayAyah={handlePlayAyah}
                  onPlayEntireSurah={handlePlayEntireSurah}
                  onToggleBookmark={handleToggleBookmark}
                  onPrevSurah={
                    selectedSurahId > 1
                      ? () => handleSelectSurah(selectedSurahId - 1)
                      : undefined
                  }
                  onNextSurah={
                    selectedSurahId < 114
                      ? () => handleSelectSurah(selectedSurahId + 1)
                      : undefined
                  }
                  reciterId={reciterId}
                  onSelectReciter={handleSelectReciter}
                  showTranslation={showTranslation}
                  onToggleTranslation={() => setShowTranslation((value) => !value)}
                  showTafsir={showTafsir}
                  onToggleTafsir={() => setShowTafsir((value) => !value)}
                  showWordByWord={showWordByWord}
                  onToggleWordByWord={() => setShowWordByWord((value) => !value)}
                />
              </div>
            )}

            {route.name === 'search' && (
              <SearchView
                allVerses={allVerses}
                surahs={surahs}
                onSelectResult={(suraId, ayaNum) => handleOpenAyah(suraId, ayaNum)}
                onPlayAyah={handlePlayAyah}
              />
            )}

            {route.name === 'bookmarks' && (
              <BookmarksView
                bookmarks={bookmarks}
                onSelectBookmark={(suraId, ayaNum) => handleOpenAyah(suraId, ayaNum)}
                onRemoveBookmark={(sura, aya) =>
                  setBookmarks((prev) =>
                    prev.filter((b) => !(b.sura === sura && b.aya === aya))
                  )
                }
                onPlayAyah={handlePlayAyah}
              />
            )}

            {route.name === 'data' && (
              <DataInspectorModal allVerses={allVerses} surahs={surahs} isModal={false} />
            )}

            {route.name === 'notFound' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
                <div className="bg-white border border-stone-200/90 rounded-2xl p-8 sm:p-10 shadow-xs text-center space-y-4">
                  <div className="text-5xl font-bold font-quran text-stone-300">٤٠٤</div>
                  <h1 className="text-2xl font-bold font-quran text-stone-900">
                    الصفحة غير موجودة
                  </h1>
                  <p className="text-sm text-stone-500 font-sans leading-relaxed">
                    الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت. يمكنك العودة إلى فهرس
                    السور لاستكشاف القرآن الكريم.
                  </p>
                  <button
                    onClick={() => navigate({ name: 'surah', surahId: 1 })}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
                  >
                    ← العودة إلى القرآن
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer: اسم النطاق والوصف وروابط الصفحات التعريفية */}
      <footer className="shrink-0 border-t border-stone-200 bg-[#FAF7F0] px-4 py-3 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right">
          <div className="text-xs text-stone-600 leading-relaxed">
            <span className="font-bold text-stone-800">
              القرآن الكريم بالرسم العثماني
            </span>
            <span className="mx-1.5 text-stone-400">·</span>
            <span>مصحف إلكتروني وقاعدة بيانات مفتوحة المصدر</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono text-stone-500" dir="ltr">
              quran.com.ly
            </span>
            <span className="hidden sm:inline text-stone-300">|</span>
            <span className="text-stone-500">تلاوات بعدة قرّاء · بحث فوري · بيانات JSON</span>
          </div>
        </div>

        {/* روابط الصفحات التعريفية */}
        <nav
          aria-label="صفحات الموقع"
          className="max-w-7xl mx-auto mt-2 pt-2 border-t border-stone-200/70 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-stone-500"
        >
          <button
            onClick={() => navigate({ name: 'about' })}
            className="hover:text-emerald-900 transition-colors"
          >
            عن المشروع
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => navigate({ name: 'sources' })}
            className="hover:text-emerald-900 transition-colors"
          >
            المصادر والتراخيص
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => navigate({ name: 'contact' })}
            className="hover:text-emerald-900 transition-colors"
          >
            تواصل معنا
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => navigate({ name: 'data' })}
            className="hover:text-emerald-900 transition-colors"
          >
            مستودع البيانات
          </button>
        </nav>

        {/* إشارة بسيطة إلى المساعدة الأولية في جلب ملفات البيانات */}
        <div className="max-w-7xl mx-auto mt-2 text-center text-[10px] sm:text-[11px] leading-relaxed text-stone-400">
          بدأ المشروع بمساعدة أدوات Google AI Studio في جلب بيانات القرآن بصيغة JSON، ثم أُكمل تطويره
          وصيانته من صاحب المشروع.
        </div>
      </footer>

      {/* Persistent Audio Player Bar */}
      {playingAyah && (
        <AudioPlayerBar
          currentAyah={playingAyah}
          currentSurah={currentPlayingSurahMeta}
          isPlaying={isPlaying}
          repeatMode={repeatMode}
          reciterId={currentReciter.id}
          audioError={audioError}
          onSelectReciter={handleSelectReciter}
          onTogglePlay={() => {
            const audio = audioRef.current;
            if (audio) {
              if (isPlaying) audio.pause();
              else
                audio.play().catch(() => {
                  /* ignore */
                });
            }
          }}
          onNextAyah={handleNextAyah}
          onPrevAyah={handlePrevAyah}
          onToggleRepeat={() => setRepeatMode(!repeatMode)}
          onClose={() => {
            audioRef.current?.pause();
            setIsPlaying(false);
            setPlayingAyah(null);
          }}
        />
      )}

      {/* Standalone Data Modal */}
      {isDataModalOpen && (
        <DataInspectorModal
          allVerses={allVerses}
          surahs={surahs}
          isModal={true}
          onClose={() => setIsDataModalOpen(false)}
        />
      )}
    </div>
  );
}
