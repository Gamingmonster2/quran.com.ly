import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Ayah, SurahMeta, SurahWithVerses, Bookmark, ViewMode, ReadingDisplayMode, QuranFontChoice, ThemeMode } from './types/quran.ts';
import { Header } from './components/Header.tsx';
import { SurahList } from './components/SurahList.tsx';
import { ReaderView } from './components/ReaderView.tsx';
import { SearchView } from './components/SearchView.tsx';
import { BookmarksView } from './components/BookmarksView.tsx';
import { DataInspectorModal } from './components/DataInspectorModal.tsx';
import { AudioPlayerBar } from './components/AudioPlayerBar.tsx';
import {
  computeAyahOffsets,
  getAyahAudioUrls,
  getGlobalAyahNumber,
} from './utils/quranHelpers.ts';
import { DEFAULT_RECITER_ID, RECITERS, getReciter } from './utils/reciters.ts';

const THEME_STORAGE_KEY = 'quran_theme';
const RECITER_STORAGE_KEY = 'quran_reciter';

export default function App() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [allVerses, setAllVerses] = useState<Ayah[]>([]);
  const [bySurahMap, setBySurahMap] = useState<Map<number, SurahWithVerses>>(new Map());
  const [selectedSurahId, setSelectedSurahId] = useState<number>(1);
  const [currentView, setCurrentView] = useState<ViewMode>('surah');
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

  // Load Quran Datasets from public/assets/data/
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // 1. Fetch Surahs index and full verses in parallel
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
        setSelectedSurahId(nextSurahObj.id);
        nextAyah = nextSurahObj.verses[0];
      }
    }

    if (nextAyah) {
      setPlayingAyah(nextAyah);
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
        setSelectedSurahId(prevSurahObj.id);
        prevAyah = prevSurahObj.verses[prevSurahObj.verses.length - 1];
      }
    }

    if (prevAyah) {
      setPlayingAyah(prevAyah);
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
      {/* Top Bar Contract (3 zones) */}
      <Header
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        theme={theme}
        onSelectTheme={setTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {isLoading ? (
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
            {currentView === 'surah' && currentSurah && (
              <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden">
                {/* Surahs Index Sidebar */}
                <SurahList
                  surahs={surahs}
                  selectedSurahId={selectedSurahId}
                  onSelectSurah={(id) => {
                    setSelectedSurahId(id);
                    // scroll reader to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />

                {/* Reader View */}
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
                      ? () => setSelectedSurahId(selectedSurahId - 1)
                      : undefined
                  }
                  onNextSurah={
                    selectedSurahId < 114
                      ? () => setSelectedSurahId(selectedSurahId + 1)
                      : undefined
                  }
                  reciterId={reciterId}
                  onSelectReciter={handleSelectReciter}
                />
              </div>
            )}

            {currentView === 'search' && (
              <SearchView
                allVerses={allVerses}
                surahs={surahs}
                onSelectResult={(suraId, ayaNum) => {
                  setSelectedSurahId(suraId);
                  setCurrentView('surah');
                  setTimeout(() => {
                    const el = document.getElementById(`ayah-${suraId}-${ayaNum}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                onPlayAyah={handlePlayAyah}
              />
            )}

            {currentView === 'bookmarks' && (
              <BookmarksView
                bookmarks={bookmarks}
                onSelectBookmark={(suraId, ayaNum) => {
                  setSelectedSurahId(suraId);
                  setCurrentView('surah');
                  setTimeout(() => {
                    const el = document.getElementById(`ayah-${suraId}-${ayaNum}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                onRemoveBookmark={(sura, aya) =>
                  setBookmarks((prev) =>
                    prev.filter((b) => !(b.sura === sura && b.aya === aya))
                  )
                }
                onPlayAyah={handlePlayAyah}
              />
            )}

            {currentView === 'data' && (
              <DataInspectorModal
                allVerses={allVerses}
                surahs={surahs}
                isModal={false}
              />
            )}
          </>
        )}
      </main>

      {/* Footer: اسم النطاق والوصف لتحسين الظهور في محركات البحث */}
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
