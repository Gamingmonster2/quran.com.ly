export interface Reciter {
  id: string;
  arabicName: string;
  englishName: string;
  /** أولويات جودة الصوت (كلما كان أعلى أولاً) */
  bitrates: number[];
  style: 'murattal' | 'mujawwad';
}

/**
 * قائمة القرّاء المتاحين صوتاً آية بآية من شبكة islamic.network (cdn.islamic.network).
 * جودة كل قارئ مُتحقَّق منها، وتُجرَّب الجودة الأعلى ثم الأقل عند تعذّر التحميل.
 */
export const RECITERS: Reciter[] = [
  {
    id: 'ar.alafasy',
    arabicName: 'مشاري راشد العفاسي',
    englishName: 'Mishary Rashid Alafasy',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.husary',
    arabicName: 'محمود خليل الحصري',
    englishName: 'Mahmoud Khalil Al-Husary',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.minshawi',
    arabicName: 'محمد صديق المنشاوي',
    englishName: 'Muhammad Siddiq Al-Minshawi',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.abdulbasitmurattal',
    arabicName: 'عبد الباسط عبد الصمد (مرتّل)',
    englishName: 'Abdul Basit (Murattal)',
    bitrates: [64],
    style: 'murattal',
  },
  {
    id: 'ar.abdurrahmaansudais',
    arabicName: 'عبد الرحمن السديس',
    englishName: 'Abdulrahman As-Sudais',
    bitrates: [64],
    style: 'murattal',
  },
  {
    id: 'ar.shaatree',
    arabicName: 'أبو بكر الشاطري',
    englishName: 'Abu Bakr Ash-Shaatree',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.hudhaify',
    arabicName: 'علي بن عبد الرحمن الحذيفي',
    englishName: 'Ali Al-Hudhaify',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.mahermuaiqly',
    arabicName: 'ماهر المعيقلي',
    englishName: 'Maher Al-Muaiqly',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.muhammadayyoub',
    arabicName: 'محمد أيوب',
    englishName: 'Muhammad Ayyoub',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.ahmedajamy',
    arabicName: 'أحمد بن علي العجمي',
    englishName: 'Ahmed Al-Ajamy',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.muhammadjibreel',
    arabicName: 'محمد جبريل',
    englishName: 'Muhammad Jibreel',
    bitrates: [128],
    style: 'murattal',
  },
  {
    id: 'ar.saoodshuraym',
    arabicName: 'سعود الشريم',
    englishName: 'Saud Al-Shuraim',
    bitrates: [64],
    style: 'murattal',
  },
  {
    id: 'ar.husarymujawwad',
    arabicName: 'محمود خليل الحصري (مجوّد)',
    englishName: 'Al-Husary (Mujawwad)',
    bitrates: [128],
    style: 'mujawwad',
  },
  {
    id: 'ar.abdullahbasfar',
    arabicName: 'عبد الله بصفر',
    englishName: 'Abdullah Basfar',
    bitrates: [64],
    style: 'murattal',
  },
  {
    id: 'ar.hanirifai',
    arabicName: 'هاني الرفاعي',
    englishName: 'Hani Ar-Rifai',
    bitrates: [64],
    style: 'murattal',
  },
];

export const DEFAULT_RECITER_ID = 'ar.alafasy';

export function getReciter(id: string): Reciter {
  return RECITERS.find((reciter) => reciter.id === id) ?? RECITERS[0];
}
