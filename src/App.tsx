import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Ayah, SurahMeta, SurahWithVerses, Bookmark, ViewMode, ReadingDisplayMode, QuranFontChoice } from './types/quran.ts';
import { Header } from './components/Header.tsx';
import { SurahList } from './components/SurahList.tsx';
import { ReaderView } from './components/ReaderView.tsx';
import { SearchView } from './components/SearchView.tsx';
import { BookmarksView } from './components/BookmarksView.tsx';
import { DataInspectorModal } from './components/DataInspectorModal.tsx';
import { AudioPlayerBar } from './components/AudioPlayerBar.tsx';
import { getAyahAudioUrl } from './utils/quranHelpers.ts';

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

  // Audio Playback State
  const [playingAyah, setPlayingAyah] = useState<Ayah | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Sync bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('quran_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.warn('Could not save bookmarks to localStorage', e);
    }
  }, [bookmarks]);

  // Audio element management
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      if (repeatMode && playingAyah) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
        return;
      }

      // Advance to next Ayah
      if (playingAyah) {
        const currentSurahObj = bySurahMap.get(playingAyah.sura);
        if (currentSurahObj) {
          if (playingAyah.aya < currentSurahObj.total_verses) {
            const nextAyah = currentSurahObj.verses.find(
              (v) => v.aya === playingAyah.aya + 1
            );
            if (nextAyah) {
              setPlayingAyah(nextAyah);
              audio.src = getAyahAudioUrl(nextAyah.sura, nextAyah.aya);
              audio.play().catch(console.error);
              return;
            }
          } else if (playingAyah.sura < 114) {
            // Move to next Surah Ayah 1
            const nextSurahObj = bySurahMap.get(playingAyah.sura + 1);
            if (nextSurahObj && nextSurahObj.verses.length > 0) {
              setSelectedSurahId(nextSurahObj.id);
              const firstAyah = nextSurahObj.verses[0];
              setPlayingAyah(firstAyah);
              audio.src = getAyahAudioUrl(firstAyah.sura, firstAyah.aya);
              audio.play().catch(console.error);
              return;
            }
          }
        }
      }

      setIsPlaying(false);
      setPlayingAyah(null);
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [playingAyah, repeatMode, bySurahMap]);

  const handlePlayAyah = (ayah: Ayah) => {
    if (!audioRef.current) return;

    if (
      isPlaying &&
      playingAyah?.sura === ayah.sura &&
      playingAyah?.aya === ayah.aya
    ) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setPlayingAyah(ayah);
      audioRef.current.src = getAyahAudioUrl(ayah.sura, ayah.aya);
      audioRef.current.play().catch((err) => {
        console.warn('Audio play request interrupted or blocked:', err);
      });
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
      handlePlayAyah(firstAyah);
    }
  };

  const handleNextAyah = () => {
    if (!playingAyah) return;
    const currentSurahObj = bySurahMap.get(playingAyah.sura);
    if (!currentSurahObj) return;

    if (playingAyah.aya < currentSurahObj.total_verses) {
      const nextAyah = currentSurahObj.verses.find(
        (v) => v.aya === playingAyah.aya + 1
      );
      if (nextAyah) handlePlayAyah(nextAyah);
    } else if (playingAyah.sura < 114) {
      const nextSurahObj = bySurahMap.get(playingAyah.sura + 1);
      if (nextSurahObj && nextSurahObj.verses.length > 0) {
        setSelectedSurahId(nextSurahObj.id);
        handlePlayAyah(nextSurahObj.verses[0]);
      }
    }
  };

  const handlePrevAyah = () => {
    if (!playingAyah) return;
    const currentSurahObj = bySurahMap.get(playingAyah.sura);
    if (!currentSurahObj) return;

    if (playingAyah.aya > 1) {
      const prevAyah = currentSurahObj.verses.find(
        (v) => v.aya === playingAyah.aya - 1
      );
      if (prevAyah) handlePlayAyah(prevAyah);
    } else if (playingAyah.sura > 1) {
      const prevSurahObj = bySurahMap.get(playingAyah.sura - 1);
      if (prevSurahObj && prevSurahObj.verses.length > 0) {
        setSelectedSurahId(prevSurahObj.id);
        const lastAyah = prevSurahObj.verses[prevSurahObj.verses.length - 1];
        handlePlayAyah(lastAyah);
      }
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

  const currentSurah = bySurahMap.get(selectedSurahId) || null;
  const currentPlayingSurahMeta = playingAyah
    ? surahs.find((s) => s.id === playingAyah.sura) || null
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-stone-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Bar Contract (3 zones) */}
      <Header
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
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

      {/* Persistent Audio Player Bar */}
      {playingAyah && (
        <AudioPlayerBar
          currentAyah={playingAyah}
          currentSurah={currentPlayingSurahMeta}
          isPlaying={isPlaying}
          repeatMode={repeatMode}
          onTogglePlay={() => {
            if (audioRef.current) {
              if (isPlaying) audioRef.current.pause();
              else audioRef.current.play();
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
