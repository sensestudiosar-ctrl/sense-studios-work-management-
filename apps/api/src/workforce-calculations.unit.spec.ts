import { datesBetween, distanceMetres, ExactDays, leaveMinutes, scheduledInstant, scheduledMinutes, workloadCategory } from "./workforce-calculations.js";
describe("S17 exact workforce calculations",()=>{
  it("preserves half-minute capacity and exact hourly policy-day fractions",()=>{
    expect(leaveMinutes({date:"2026-10-05",portion:"HALF"},481)).toBe(240.5);
    const hourly=ExactDays.decimal(1).div(ExactDays.decimal(3));expect(hourly.add(hourly).add(hourly).compare(ExactDays.decimal(1))).toBe(0);
    expect(ExactDays.snapshot(hourly.toJSON()).toJSON()).toEqual({numerator:"1",denominator:"3"});
  });
  it("handles leap-year calendar ranges and scheduled weekly offs",()=>{
    expect(datesBetween("2024-01-01","2024-12-31")).toHaveLength(366);
    expect(()=>datesBetween("2026-02-30","2026-03-01")).toThrow("Invalid calendar date");
    expect(scheduledMinutes({workingDays:[1],startMinute:540,endMinute:1020,breakMinutes:30,dailyCapacityMinutes:450},"2026-10-04")).toBe(0);
    expect(()=>leaveMinutes({date:"2026-10-04",portion:"FULL"},0)).toThrow("effective working schedule");
  });
  it("uses configured utilization thresholds and zero-capacity overload",()=>{
    expect(workloadCategory(30,100,{under:40,near:80,over:100})).toBe("Under-utilized");
    expect(workloadCategory(85,100,{under:40,near:80,over:100})).toBe("Near Capacity");
    expect(workloadCategory(1,0,{under:40,near:80,over:100})).toBe("Overloaded");
    expect(workloadCategory(0,100,undefined)).toBe("SETUP_REQUIRED");
  });
  it("resolves overnight wall-clock start and end in configured timezone",()=>{
    expect(scheduledInstant("2026-10-02",1320,"Asia/Kolkata").toISOString()).toBe("2026-10-02T16:30:00.000Z");
    expect(scheduledInstant("2026-10-03",360,"Asia/Kolkata").toISOString()).toBe("2026-10-03T00:30:00.000Z");
  });
  it("keeps haversine distance finite at antipodes and exact at same point",()=>{
    expect(distanceMetres({latitude:0,longitude:0},{latitude:0,longitude:0})).toBe(0);
    expect(distanceMetres({latitude:0,longitude:0},{latitude:0,longitude:180})).toBeCloseTo(Math.PI*6371000,4);
  });
});
