export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid calendar date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date");
  return date;
}

export function localCalendarDate(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (kind: string) => parts.find((item) => item.type === kind)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isScheduledDate(frequency: RecurrenceFrequency, anchorDate: string, date: string): boolean {
  const anchor = parseCalendarDate(anchorDate);
  const current = parseCalendarDate(date);
  if (date < anchorDate) return false;
  if (frequency === "DAILY") return true;
  if (frequency === "WEEKLY") return (current.getTime() - anchor.getTime()) % (7 * 86_400_000) === 0;
  const lastDay = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
  return current.getUTCDate() === Math.min(anchor.getUTCDate(), lastDay);
}

export function nextScheduledDate(frequency: RecurrenceFrequency, anchorDate: string, afterDate: string): string {
  parseCalendarDate(anchorDate);
  if (anchorDate > afterDate) return anchorDate;
  const candidate = parseCalendarDate(afterDate);
  for (let days = 0; days < 367; days++) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    const date = candidate.toISOString().slice(0, 10);
    if (isScheduledDate(frequency, anchorDate, date)) return date;
  }
  throw new Error("No scheduled date within one year");
}
