import NepDateModule from 'nepali-date-converter';

const NepaliDate = NepDateModule?.default || NepDateModule;

const BS_MONTHS = ['Baishakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Asoj', 'Kartik', 'Mangsir', 'Push', 'Magh', 'Falgun', 'Chaitra'];

/** Convert an AD date to Bikram Sambat; returns null when unsupported/invalid. */
export function toBs(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new NepaliDate(d);
  } catch {
    return null;
  }
}

/** "Shrawan 29, 2083" — Bikram Sambat in English script. */
export function fmtBs(dateStr) {
  const bs = toBs(dateStr);
  if (!bs) return null;
  return `${BS_MONTHS[bs.getMonth()]} ${bs.getDate()}, ${bs.getYear()}`;
}

export default { toBs, fmtBs };
