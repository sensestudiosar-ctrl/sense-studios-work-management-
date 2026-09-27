export interface QuietHours {
  startLocal: string;
  endLocal: string;
  timeZone: string;
}

export function isIanaTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function isLocalTime(value: string): boolean {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  return true;
}

export function validateQuietHours(value: QuietHours): void {
  if (!isLocalTime(value.startLocal) || !isLocalTime(value.endLocal) || value.startLocal === value.endLocal || !isIanaTimeZone(value.timeZone)) {
    throw new Error("Invalid quiet-hours configuration");
  }
}

function localMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

function parseMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour! * 60 + minute!;
}

/** Local-clock comparison naturally covers repeated times and DST gaps in the configured IANA zone. */
export function isWithinQuietHours(now: Date, quietHours: QuietHours): boolean {
  validateQuietHours(quietHours);
  const minute = localMinutes(now, quietHours.timeZone);
  const start = parseMinutes(quietHours.startLocal);
  const end = parseMinutes(quietHours.endLocal);
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}
