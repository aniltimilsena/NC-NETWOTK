/**
 * Production-ready localized formatters for English (en) and Nepali (ne).
 */

const NEPALI_DIGITS: { [key: string]: string } = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
};

export const toNepaliDigits = (numStr: string | number): string => {
  return String(numStr).replace(/\d/g, (digit) => NEPALI_DIGITS[digit] || digit);
};

export const formatNumber = (num: number | string, lang: string = 'en'): string => {
  const n = typeof num === 'number' ? num : parseFloat(num);
  if (isNaN(n)) return String(num);

  if (lang === 'ne' || lang === 'np') {
    try {
      const formatted = new Intl.NumberFormat('ne-NP').format(n);
      return formatted;
    } catch (_e) {
      return toNepaliDigits(n);
    }
  }

  return new Intl.NumberFormat('en-US').format(n);
};

export const formatDate = (
  dateInput: Date | string | number,
  lang: string = 'en',
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const defaultOptions: Intl.DateTimeFormatOptions = options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const targetLocale = lang === 'ne' || lang === 'np' ? 'ne-NP' : 'en-US';

  try {
    const formatted = new Intl.DateTimeFormat(targetLocale, defaultOptions).format(date);
    if (lang === 'ne' || lang === 'np') {
      return toNepaliDigits(formatted);
    }
    return formatted;
  } catch (_e) {
    return date.toLocaleDateString();
  }
};

export const formatTime = (dateInput: Date | string | number, lang: string = 'en'): string => {
  return formatDate(dateInput, lang, { hour: '2-digit', minute: '2-digit' });
};

export const formatCurrency = (
  amount: number | string,
  _currency: string = 'NPR',
  lang: string = 'en'
): string => {
  const n = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(n)) return String(amount);

  if (lang === 'ne' || lang === 'np') {
    return `रु ${toNepaliDigits(formatNumber(n, 'en'))}`;
  }

  return `Rs. ${formatNumber(n, 'en')}`;
};
