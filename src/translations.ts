export const genreFA: Record<string, string> = {
  Action: 'اکشن',
  Adventure: 'ماجراجویی',
  Animation: 'انیمیشن',
  Comedy: 'کمدی',
  Crime: 'جنایی',
  Documentary: 'مستند',
  Drama: 'درام',
  Fantasy: 'فانتزی',
  'Film-Noir': 'فیلم نوآر',
  Horror: 'ترسناک',
  Musical: 'موزیکال',
  Mystery: 'معمایی',
  Romance: 'رمانتیک',
  'Sci-Fi': 'علمی-تخیلی',
  Short: 'کوتاه',
  Sport: 'ورزشی',
  Thriller: 'هیجان‌انگیز',
  War: 'جنگی',
  Western: 'وسترن',
  Biography: 'بیوگرافی',
  History: 'تاریخی',
  Music: 'موسیقی',
  Family: 'خانوادگی',
}

export const countryFA: Record<string, string> = {
  USA: 'ایالات متحده آمریکا',
  'United States': 'ایالات متحده آمریکا',
  UK: 'بریتانیا',
  'United Kingdom': 'بریتانیا',
  France: 'فرانسه',
  Germany: 'آلمان',
  Italy: 'ایتالیا',
  Spain: 'اسپانیا',
  Australia: 'استرالیا',
  Canada: 'کانادا',
  Japan: 'ژاپن',
  'South Korea': 'کره جنوبی',
  Iran: 'ایران',
  India: 'هند',
  China: 'چین',
  Russia: 'روسیه',
  Brazil: 'برزیل',
  Mexico: 'مکزیک',
  Sweden: 'سوئد',
  Denmark: 'دانمارک',
  Norway: 'نروژ',
  Finland: 'فنلاند',
  Netherlands: 'هلند',
  'New Zealand': 'نیوزیلند',
  Ireland: 'ایرلند',
  'Hong Kong': 'هنگ کنگ',
}

export const languageFA: Record<string, string> = {
  English: 'انگلیسی',
  French: 'فرانسوی',
  German: 'آلمانی',
  Spanish: 'اسپانیایی',
  Italian: 'ایتالیایی',
  Japanese: 'ژاپنی',
  Korean: 'کره‌ای',
  Chinese: 'چینی',
  Mandarin: 'ماندارین',
  Arabic: 'عربی',
  Persian: 'فارسی',
  Russian: 'روسی',
  Portuguese: 'پرتغالی',
  Hindi: 'هندی',
  Swedish: 'سوئدی',
  Danish: 'دانمارکی',
  Dutch: 'هلندی',
}

export function translateGenres(genre: string): string {
  return genre
    .split(', ')
    .map((g) => genreFA[g] || g)
    .join('، ')
}

export function translateCountries(country: string): string {
  return country
    .split(', ')
    .map((c) => countryFA[c] || c)
    .join('، ')
}

export function translateLanguages(language: string): string {
  return language
    .split(', ')
    .map((l) => languageFA[l] || l)
    .join('، ')
}
