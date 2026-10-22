/**
 * إدارة بيانات SEO لكل صفحة: العنوان والوصف والرابط الأساسي وبطاقات المشاركة
 * والبيانات المنظمة (JSON-LD) — تُحدَّث ديناميكيًا عند تغيير المسار.
 */
import { SurahMeta } from '../types/quran.ts';
import { SITE_URL, routeToAbsoluteUrl, routeLang, withLang, Route } from '../router.ts';

const OG_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1';
const STRUCTURED_DATA_ID = 'page-structured-data';

export interface PageSeoInput {
  title: string;
  description: string;
  route: Route;
  robots?: string;
  jsonLd?: unknown;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
  );
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/** يضيف/يحدّث رابط hreflang (نسخة اللغة الأخرى للصفحة) */
function upsertAlternate(hreflang: string, href: string) {
  const selector = `link[rel="alternate"][hreflang="${hreflang}"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'alternate');
    element.setAttribute('hreflang', hreflang);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function applyPageSeo({ title, description, route, robots, jsonLd }: PageSeoInput) {
  const canonical = routeToAbsoluteUrl(route);
  const lang = routeLang(route);

  document.title = title;
  document.documentElement.setAttribute('lang', lang);
  // الموقع عربي-أولًا؛ تبقى اتجاهية التخطيط RTL حتى في الواجهة الإنجليزية
  document.documentElement.setAttribute('dir', 'rtl');

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots ?? DEFAULT_ROBOTS);
  upsertLink('canonical', canonical);

  // نسخ اللغتين لتحسين الفهرسة في محركات البحث
  upsertAlternate('ar', routeToAbsoluteUrl(withLang(route, 'ar')));
  upsertAlternate('en', routeToAbsoluteUrl(withLang(route, 'en')));
  upsertAlternate('x-default', routeToAbsoluteUrl(withLang(route, 'ar')));

  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:image', OG_IMAGE);
  upsertMeta('property', 'og:locale', lang === 'en' ? 'en_US' : 'ar_LY');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', OG_IMAGE);

  document.getElementById(STRUCTURED_DATA_ID)?.remove();
  if (jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = STRUCTURED_DATA_ID;
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }
}

interface StructuredDataOptions {
  surah: SurahMeta;
  url: string;
  ayahNumber?: number;
  ayahText?: string;
}

export function buildSurahJsonLd({ surah, url, ayahNumber, ayahText }: StructuredDataOptions) {
  const chapterId = `${SITE_URL}/surah/${surah.id}#chapter`;
  const surahType = surah.type === 'meccan' ? 'مكية' : 'مدنية';

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Chapter',
      '@id': chapterId,
      name: `سورة ${surah.name}`,
      alternateName: [surah.transliteration],
      position: surah.id,
      inLanguage: 'ar',
      url,
      description: `سورة ${surah.name} (${surah.transliteration}) — سورة ${surahType}، عدد آياتها ${surah.total_verses} آية بالرسم العثماني.`,
      isPartOf: {
        '@type': 'Book',
        name: 'القرآن الكريم',
        inLanguage: 'ar',
        url: `${SITE_URL}/`,
        numberOfPages: 114,
      },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'الرئيسية',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: `سورة ${surah.name}`,
          item: `${SITE_URL}/surah/${surah.id}`,
        },
      ],
    },
  ];

  if (ayahNumber) {
    graph[1] = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: `سورة ${surah.name}`,
          item: `${SITE_URL}/surah/${surah.id}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: `الآية ${ayahNumber}`,
          item: url,
        },
      ],
    };
    graph.push({
      '@type': 'Quotation',
      '@id': `${url}#ayah-${ayahNumber}`,
      text: ayahText,
      position: ayahNumber,
      inLanguage: 'ar',
      isPartOf: { '@id': chapterId },
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildWebPageJsonLd(title: string, description: string, route: Route) {
  const url = routeToAbsoluteUrl(route);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url,
    name: title,
    description,
    inLanguage: 'ar',
    isPartOf: { '@type': 'WebSite', url: `${SITE_URL}/`, name: 'quran.com.ly' },
  };
}
