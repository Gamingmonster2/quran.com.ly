import {
  Bug,
  ExternalLink as ExternalLinkIcon,
  GitPullRequest,
  Github,
  Globe,
  Heart,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

const REPO_URL = 'https://github.com/Gamingmonster2/quran.com.ly';
const ISSUES_URL = 'https://github.com/Gamingmonster2/quran.com.ly/issues';
const NEW_ISSUE_URL = 'https://github.com/Gamingmonster2/quran.com.ly/issues/new';
const SECURITY_URL = 'https://github.com/Gamingmonster2/quran.com.ly/security';
const SITE_URL = 'https://quran.com.ly';

/** خطوات إعداد بلاغ جيد في Issues */
const ISSUE_STEPS = [
  'ابحث أولًا في البلاغات المفتوحة والمغلقة، فقد تكون المشكلة مطروحة ومناقشة سابقًا.',
  'اضغط «New issue» واختر النوع المناسب: بلاغ خطأ أو اقتراح ميزة.',
  'اشرح ما فعلته وما توقّعته وما حدث فعلاً، خطوة بخطوة وبأقل قدر من التفاصيل الكافية.',
  'أضف بيئة الاستخدام: المتصفح وإصداره، والجهاز (جوال/حاسوب)، ولقطة شاشة إن أمكن.',
  'إذا كانت الملاحظة تخص نصًا أو تلاوة، اذكر رقم السورة ورقم الآية وتفصيل الملاحظة.',
];

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
      <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      {title}
    </h2>
  );
}

function LinkButton({
  href,
  variant = 'primary',
  children,
}: {
  href: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors';
  const styles =
    variant === 'primary'
      ? 'text-white bg-stone-900 hover:bg-stone-800 shadow-sm'
      : 'text-stone-700 bg-white border border-stone-200 hover:bg-stone-50';
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${styles}`}>
      {children}
    </a>
  );
}

export default function ContactPage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* ترويسة الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold font-quran text-stone-900">
                تواصل معنا
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 font-sans mt-1 leading-relaxed">
                القناة الرسمية للتواصل هي مستودع المشروع على GitHub: بلاغات الأخطاء، اقتراحات
                المزايا، والمساهمات في الشيفرة.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-[11px] font-medium text-stone-600">
            <Github className="w-3.5 h-3.5" aria-hidden="true" />
            GitHub هي القناة الرسمية
          </span>
        </div>

        {/* مقدمة */}
        <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F0] border border-stone-200/90 p-4">
          <MessageSquare
            className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-2 text-sm leading-relaxed text-stone-700">
            <p>
              لا ننشر في الموقع بريدًا إلكترونيًا شخصيًا. جميع قنوات التواصل تمر عبر GitHub لأنها
              شفافة وقابلة للتتبع، وتتيح لكل من يهمه الأمر متابعة النقاش ونتيجته.
            </p>
            <p className="text-xs text-stone-500">
              الموقع الرسمي:{' '}
              <a
                href={SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:text-emerald-900 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                <span dir="ltr" className="font-mono text-[11px]">
                  quran.com.ly
                </span>
                <ExternalLinkIcon className="w-3 h-3" aria-hidden="true" />
              </a>
            </p>
          </div>
        </div>

        {/* المستودع الرسمي */}
        <section className="space-y-3">
          <SectionTitle icon={Github} title="المستودع الرسمي" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-stone-200/90 bg-stone-50 p-4 sm:p-5">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0">
                <Github className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-stone-900">quran.com.ly على GitHub</h3>
                <p className="text-xs leading-relaxed text-stone-500 mt-1">
                  الشيفرة الكاملة، وتاريخ التطوير، وقائمة البلاغات، وطريقة المساهمة.
                </p>
                <p
                  dir="ltr"
                  className="font-mono text-[11px] text-emerald-800 mt-1.5 break-all text-left"
                >
                  github.com/Gamingmonster2/quran.com.ly
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <LinkButton href={REPO_URL}>
                <Github className="w-3.5 h-3.5" aria-hidden="true" />
                <span>فتح المستودع</span>
              </LinkButton>
              <LinkButton href={ISSUES_URL} variant="secondary">
                <span>قسم Issues</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </LinkButton>
            </div>
          </div>
        </section>

        {/* الإبلاغ عن مشكلة */}
        <section className="space-y-4">
          <SectionTitle icon={Bug} title="الإبلاغ عن مشكلة أو اقتراح ميزة" />
          <p className="text-sm leading-relaxed text-stone-700">
            قسم Issues هو المكان الأنسب للإبلاغ عن أي خطأ أو اقتراح. البلاغ المحدد والواضح يصلح
            أسرع من البلاغ العام، ويساعد على إصلاح المشكلة دون أسئلة إضافية.
          </p>
          <ol className="space-y-2.5">
            {ISSUE_STEPS.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 border border-stone-200/70 text-xs sm:text-[13px] leading-relaxed text-stone-700"
              >
                <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href={ISSUES_URL} variant="secondary">
              <span>عرض البلاغات الحالية</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </LinkButton>
            <LinkButton href={NEW_ISSUE_URL}>
              <Bug className="w-3.5 h-3.5" aria-hidden="true" />
              <span>إنشاء بلاغ جديد</span>
            </LinkButton>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-[#FAF7F0] border border-stone-200/80 p-3 text-[11px] sm:text-xs leading-relaxed text-stone-600">
            <ShieldCheck
              className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              لا تشارك معلومات شخصية حساسة في بلاغ عام؛ فكل ما يُكتب في Issues يكون مرئيًا
              للجميع. ويكفي لوصف المشكلة ذكر المتصفح والجهاز ورقم السورة والآية عند الحاجة.
            </span>
          </div>
        </section>

        {/* البلاغات الأمنية */}
        <section className="space-y-3">
          <SectionTitle icon={Lock} title="البلاغات الأمنية" />
          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-3">
            <p className="text-sm leading-relaxed text-stone-700">
              إذا لاحظت ثغرة أمنية، فلا تنشر تفاصيلها في Issues عامة. استخدم تبويب Security في
              المستودع على GitHub، واستخدم خاصية الإبلاغ الخاص «Report a vulnerability» إن كانت
              مفعّلة، ليصل البلاغ إلى صاحب المشروع دون نشره للعامة.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton href={SECURITY_URL} variant="secondary">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>تبويب Security في المستودع</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </LinkButton>
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              ساعدنا في حماية زوّار الموقع: أرسل أقل قدر من البيانات اللازمة لإعادة إنتاج المشكلة،
              وامنح وقتًا معقولًا للمعالجة قبل أي نشر علني.
            </p>
          </div>
        </section>

        {/* المساهمة */}
        <section className="space-y-3">
          <SectionTitle icon={GitPullRequest} title="المساهمة في المشروع" />
          <div className="rounded-xl border border-stone-200/90 bg-stone-50 p-4 sm:p-5 space-y-3">
            <p className="text-sm leading-relaxed text-stone-700">
              المساهمات في الشيفرة والتصميم والترجمة مرحّب بها. الطريقة المعتادة: اعمل نسخة Fork
              من المستودع، ثم أنشئ فرعًا بعنوان واضح لإصلاحك، ثم أرسل Pull Request يشرح التغيير
              وسببه.
            </p>
            <p className="text-xs leading-relaxed text-stone-600">
              شيفرة المشروع منشورة تحت رخصة MIT، وتُقدَّم كما هي دون ضمان. وراجع صفحة المصادر
              لمعرفة تراخيص البيانات والخطوط قبل إعادة النشر.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton href={`${REPO_URL}/pulls`} variant="secondary">
                <GitPullRequest className="w-3.5 h-3.5" aria-hidden="true" />
                <span>طلبات السحب الحالية</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </LinkButton>
            </div>
          </div>
        </section>

        {/* البريد الإلكتروني */}
        <section className="space-y-3">
          <SectionTitle icon={Mail} title="البريد الإلكتروني" />
          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-2.5">
            <p className="text-sm leading-relaxed text-stone-700">
              <span className="font-bold text-stone-900">لا يوجد بريد تواصل منشور حاليًا.</span>{' '}
              تجنّبنا نشر أي بريد شخصي في الموقع، واعتمدنا GitHub بديلاً عنه لأنه يحفظ التواصل
              موثّقًا ومتاحًا للجميع.
            </p>
            <p className="text-xs leading-relaxed text-stone-500">
              قد يُضاف بريد تواصل رسمي للمشروع لاحقًا عند الحاجة، وسيُعلن هنا وفي تذييل الموقع عند
              إضافته.
            </p>
          </div>
        </section>

        {/* خاتمة */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-[#FAF7F0] border border-stone-200/90 p-4 sm:p-5">
          <div className="flex items-start gap-3 min-w-0">
            <Heart className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-stone-600">
              يُصان هذا المشروع على أساس تطوّعي، وقد يتأخر الرد أحيانًا. البلاغات المحددة
              والواضحة تساعدنا على المعالجة أسرع. جزاكم الله خيرًا على الملاحظات والدعم.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
            >
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>زيارة الموقع</span>
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <Github className="w-3.5 h-3.5" aria-hidden="true" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
