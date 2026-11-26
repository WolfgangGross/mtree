/**
 * Humans write dates the way papers do: "Mar 2015", "2021–22", "Sep–Oct 2022",
 * "Sep 2026 report". We keep that text for display and derive a decimal year
 * (2015.2) for ordering and the timeline.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function parseWhen(text: string): number | null {
  const year = /\b(19\d{2}|20\d{2})\b/.exec(text);
  if (!year) return null;
  const y = Number(year[1]);
  const month = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?/i.exec(text);
  if (!month) return y + 0.5;
  const m = MONTHS.indexOf(month[1].slice(0, 3).toLowerCase());
  return y + (m + 0.5) / 12;
}

export function yearOf(text: string): number | null {
  const year = /\b(19\d{2}|20\d{2})\b/.exec(text);
  return year ? Number(year[1]) : null;
}
