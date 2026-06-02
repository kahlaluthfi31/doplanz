const pad = (n) => String(n).padStart(2, '0');

export function formatTimeValue(timeStr, timeFormat = '24h') {
  if (!timeStr) return '';
  const [hRaw, mRaw] = timeStr.split(':');
  const hours = Number(hRaw);
  const minutes = Number(mRaw);
  if (Number.isNaN(hours)) return timeStr;

  if (timeFormat === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${pad(Number.isNaN(minutes) ? 0 : minutes)} ${period}`;
  }

  return `${pad(hours)}:${pad(Number.isNaN(minutes) ? 0 : minutes)}`;
}

export function formatDateValue(dateInput, dateFormat = 'DD/MM/YYYY', locale = 'id-ID') {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  switch (dateFormat) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD MMM YYYY': {
      return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    }
    case 'DD/MM/YYYY':
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatDateTimeValue(dateInput, timeStr, options = {}) {
  const { dateFormat = 'DD/MM/YYYY', timeFormat = '24h', locale = 'id-ID' } = options;
  const datePart = formatDateValue(dateInput, dateFormat, locale);
  const timePart = timeStr ? formatTimeValue(timeStr, timeFormat) : '';
  return timePart ? `${datePart} ${timePart}` : datePart;
}

export function getLocaleFromLanguage(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'su') return 'id-ID';
  return 'id-ID';
}
