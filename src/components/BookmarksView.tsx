import React from 'react';
import { Bookmark, Trash2, ArrowLeft, Play } from 'lucide-react';
import { Bookmark as BookmarkType, Ayah } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';
import { useI18n } from '../i18n.tsx';

interface BookmarksViewProps {
  bookmarks: BookmarkType[];
  onSelectBookmark: (sura: number, aya: number) => void;
  onRemoveBookmark: (sura: number, aya: number) => void;
  onPlayAyah: (ayah: Ayah) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  bookmarks,
  onSelectBookmark,
  onRemoveBookmark,
  onPlayAyah,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs mb-6 text-right">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
            <Bookmark aria-hidden="true" className="w-5 h-5 fill-amber-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-quran text-stone-900">
              {t('bookmarks.title')}
            </h2>
            <p className="text-xs text-stone-500 font-sans mt-1">
              {t('bookmarks.desc')}
            </p>
          </div>
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16 bg-white border border-stone-200/80 rounded-2xl p-8 space-y-3">
          <Bookmark
            aria-hidden="true"
            className="w-10 h-10 text-stone-300 mx-auto"
          />
          <h3 className="text-lg font-bold font-quran text-stone-700">
            {t('bookmarks.emptyTitle')}
          </h3>
          <p className="text-xs text-stone-500 font-sans max-w-sm mx-auto">
            {t('bookmarks.emptyDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bm) => (
            <div
              key={`${bm.sura}-${bm.aya}`}
              className="bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl p-5 shadow-xs transition-colors"
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100 text-xs text-stone-500 font-sans">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800">
                    سورة {bm.surahName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t('verse.of')} {toArabicDigits(bm.aya)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-stone-400">
                    {bm.sura}:{bm.aya}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onPlayAyah({ sura: bm.sura, aya: bm.aya, text: bm.previewText })
                    }
                    className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                    title={t('bookmarks.recite')}
                    aria-label={t('bookmarks.recite')}
                  >
                    <Play aria-hidden="true" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemoveBookmark(bm.sura, bm.aya)}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title={t('bookmarks.delete')}
                    aria-label={t('bookmarks.delete')}
                  >
                    <Trash2 aria-hidden="true" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectBookmark(bm.sura, bm.aya)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white text-xs transition-colors"
                  >
                    <span>{t('bookmarks.open')}</span>
                    <ArrowLeft aria-hidden="true" className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* نص الآية يبقى RTL دائماً مهما كانت لغة الواجهة */}
              <p
                dir="rtl"
                className="font-quran text-xl text-stone-900 leading-loose text-right"
              >
                {bm.previewText}
                <span className="inline-flex items-center justify-center font-amiri text-stone-500 mx-2 text-xs border border-stone-300 rounded-full w-6 h-6 align-middle bg-stone-50">
                  {toArabicDigits(bm.aya)}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
