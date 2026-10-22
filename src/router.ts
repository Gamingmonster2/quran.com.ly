/**
 * موجّه خفيف للموقع (History API) بدون أي مكتبات خارجية.
 * المسارات (عربي):
 *   /                     → قراءة القرآن (تُفتح على سورة الفاتحة)
 *   /surah/:id            → سورة محددة
 *   /surah/:id/:ayah      → آية محددة داخل سورة
 *   /search | /bookmarks | /data → أدوات الموقع
 *   /about | /sources | /contact | /api → صفحات تعريفية
 *
 * النسخة الإنجليزية تُستخدم بنفس المسارات مع بادئة `/en`:
 *   /en · /en/surah/2 · /en/search · /en/about …
 */
import type { Lang } from './i18n.tsx';

export const SITE_URL = 'https://quran.com.ly';
export const TOTAL_SURAHS = 114;

export type StaticRouteName = 'about' | 'sources' | 'contact' | 'api';

type RouteBase =
  | { name: 'surah'; surahId: number; ayahId?: number }
  | { name: 'search' }
  | { name: 'bookmarks' }
  | { name: 'data' }
  | { name: 'about' }
  | { name: 'sources' }
  | { name: 'contact' }
  | { name: 'api' }
  | { name: 'notFound' };

/** لغة الواجهة محمولة داخل المسار (افتراضيًا العربية) */
export type Route = RouteBase & { lang?: Lang };

export type ViewRouteName = 'surah' | 'search' | 'bookmarks' | 'data';

export function isValidSurahId(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= TOTAL_SURAHS;
}

/** لغة الواجهة لمسار معيّن */
export function routeLang(route: Route): Lang {
  return route.lang === 'en' ? 'en' : 'ar';
}

function parseBaseRoute(clean: string): RouteBase {
  const surahMatch = clean.match(/^\/surah\/(\d{1,3})(?:\/(\d{1,4}))?$/);
  if (surahMatch) {
    const surahId = Number(surahMatch[1]);
    const ayahId = surahMatch[2] ? Number(surahMatch[2]) : undefined;
    if (isValidSurahId(surahId) && (!ayahId || (Number.isInteger(ayahId) && ayahId >= 1))) {
      return { name: 'surah', surahId, ayahId };
    }
    return { name: 'notFound' };
  }

  switch (clean) {
    case '/':
      return { name: 'surah', surahId: 1 };
    case '/search':
      return { name: 'search' };
    case '/bookmarks':
      return { name: 'bookmarks' };
    case '/data':
      return { name: 'data' };
    case '/about':
      return { name: 'about' };
    case '/sources':
      return { name: 'sources' };
    case '/contact':
      return { name: 'contact' };
    case '/api':
      return { name: 'api' };
    default:
      return { name: 'notFound' };
  }
}

export function parseLocation(pathname: string): Route {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const hasEnglishPrefix = /^\/en(?:\/|$)/.test(clean);
  const lang: Lang = hasEnglishPrefix ? 'en' : 'ar';
  const withoutLang = hasEnglishPrefix
    ? clean.replace(/^\/en(?=\/|$)/, '') || '/'
    : clean;

  return { ...parseBaseRoute(withoutLang), lang };
}

function baseRouteToPath(route: Route): string {
  switch (route.name) {
    case 'surah': {
      // سورة الفاتحة بدون رقم آية = الصفحة الرئيسية (رابط أساسي واحد)
      if (route.surahId === 1 && !route.ayahId) return '/';
      return route.ayahId
        ? `/surah/${route.surahId}/${route.ayahId}`
        : `/surah/${route.surahId}`;
    }
    case 'search':
      return '/search';
    case 'bookmarks':
      return '/bookmarks';
    case 'data':
      return '/data';
    case 'about':
      return '/about';
    case 'sources':
      return '/sources';
    case 'contact':
      return '/contact';
    case 'api':
      return '/api';
    case 'notFound':
      return '/404';
  }
}

export function routeToPath(route: Route): string {
  const basePath = baseRouteToPath(route);
  if (routeLang(route) !== 'en') return basePath;
  return basePath === '/' ? '/en' : `/en${basePath}`;
}

export function routeToAbsoluteUrl(route: Route): string {
  return `${SITE_URL}${routeToPath(route)}`;
}

/** نفس المسار بلغة أخرى (لاستبدال لغة الواجهة) */
export function withLang(route: Route, lang: Lang): Route {
  return { ...route, lang };
}

/** يعيد اسم العرض الحالي للقائمة العلوية، أو null للصفحات التعريفية */
export function routeToView(route: Route): ViewRouteName | null {
  switch (route.name) {
    case 'surah':
      return 'surah';
    case 'search':
      return 'search';
    case 'bookmarks':
      return 'bookmarks';
    case 'data':
      return 'data';
    default:
      return null;
  }
}

export function isStaticPageRoute(
  route: Route
): route is Route & { name: StaticRouteName } {
  return (
    route.name === 'about' ||
    route.name === 'sources' ||
    route.name === 'contact' ||
    route.name === 'api'
  );
}
