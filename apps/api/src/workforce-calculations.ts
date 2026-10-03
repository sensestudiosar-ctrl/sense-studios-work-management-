export type WorkScheduleData = { workingDays: number[]; startMinute: number; endMinute: number; breakMinutes: number; dailyCapacityMinutes: number };
export type LeaveDay = { date: string; portion: "FULL" | "HALF" | "HOURLY"; minutes?: number | undefined; capacityMinutes?: number | undefined; days?: string | undefined; exactDays?: { numerator: string; denominator: string } | undefined };
export function dateValue(value: string): Date {
  const result = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(result.getTime()) || result.toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date");
  return result;
}
export function datesBetween(from: string, to: string): string[] {
  const first = dateValue(from), last = dateValue(to); const result = [];
  if (last < first || last.getTime() - first.getTime() > 365 * 86400000) throw new Error("Date range must contain at most 366 days");
  for (let time = first.getTime(); time <= last.getTime(); time += 86400000) result.push(new Date(time).toISOString().slice(0, 10));
  return result;
}
export function scheduledMinutes(schedule: WorkScheduleData | undefined, date: string): number {
  return schedule && schedule.workingDays.includes(dateValue(date).getUTCDay()) ? schedule.dailyCapacityMinutes : 0;
}
export function leaveMinutes(day: LeaveDay, capacity: number): number {
  if (capacity <= 0) throw new Error("Leave needs an effective working schedule");
  const minutes = day.portion === "FULL" ? capacity : day.portion === "HALF" ? capacity / 2 : day.minutes;
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0 || minutes > capacity) throw new Error("Leave exceeds scheduled capacity");
  return minutes;
}
export function workloadCategory(allocated: number, capacity: number, thresholds: { under: number; near: number; over: number } | undefined): string {
  if (!thresholds) return "SETUP_REQUIRED";
  const percent = capacity <= 0 ? allocated > 0 ? Infinity : 0 : allocated / capacity * 100;
  return percent >= thresholds.over ? "Overloaded" : percent >= thresholds.near ? "Near Capacity" : percent < thresholds.under ? "Under-utilized" : "Healthy";
}
export function distanceMetres(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (v: number) => v * Math.PI / 180;
  const latitude = rad(b.latitude - a.latitude), longitude = rad(b.longitude - a.longitude);
  const value = Math.sin(latitude / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(longitude / 2) ** 2;
  const clamped = Math.max(0, Math.min(1, value));
  return 6371000 * 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
}
/** Resolve a scheduled local wall time without assuming an eight-hour day or UTC offset. */
export function scheduledInstant(date: string, minute: number, timezone: string): Date {
  const base = dateValue(date).getTime() + minute * 60000;
  let estimate = base;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let i=0;i<4;i++) { const parts = Object.fromEntries(formatter.formatToParts(new Date(estimate)).map(p => [p.type,p.value])); const observed = Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second)); const difference = base-observed; if (!difference) return new Date(estimate); estimate+=difference; }
  throw new Error("Scheduled wall time is unavailable in the organization timezone");
}
/** Exact policy-day arithmetic. Decimal summaries never decide eligibility. */
export class ExactDays {
  readonly numerator: bigint; readonly denominator: bigint;
  constructor(numerator: bigint, denominator=1n) {
    if(denominator<=0n) throw new Error("Invalid exact-day denominator");
    let a=numerator<0n?-numerator:numerator,b=denominator;
    while(b) {const r=a%b;a=b;b=r;} const divisor=a||1n;
    this.numerator=numerator/divisor;this.denominator=denominator/divisor;
  }
  static decimal(value:string|number) {const text=String(value); if(!/^-?\d+(?:\.\d+)?$/.test(text)) throw new Error("Invalid exact-day decimal");const [whole,fraction=""]=text.split(".");return new ExactDays(BigInt(whole!+fraction),10n**BigInt(fraction.length));}
  static snapshot(value:{numerator:string;denominator:string}) {return new ExactDays(BigInt(value.numerator),BigInt(value.denominator));}
  add(value:ExactDays) {return new ExactDays(this.numerator*value.denominator+value.numerator*this.denominator,this.denominator*value.denominator);}
  sub(value:ExactDays) {return this.add(new ExactDays(-value.numerator,value.denominator));}
  div(value:ExactDays) {if(value.numerator<=0n) throw new Error("Invalid exact-day divisor");return new ExactDays(this.numerator*value.denominator,this.denominator*value.numerator);}
  compare(value:ExactDays) {const difference=this.numerator*value.denominator-value.numerator*this.denominator;return difference<0n?-1:difference>0n?1:0;}
  toJSON() {return {numerator:this.numerator.toString(),denominator:this.denominator.toString()};}
}
