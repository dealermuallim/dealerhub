import type { AdminVehicle } from "./vehicles";

export const REPORTING_TIME_ZONE = "America/New_York";
export function reportingTimeZone(configured: string | null): string {
  try {
    if (configured) {
      new Intl.DateTimeFormat("en-US", { timeZone: configured }).format();
      return configured;
    }
  } catch {
    /* Older or invalid tenant settings use the documented fallback. */
  }
  return REPORTING_TIME_ZONE;
}
const DAY = 86_400_000;
function validDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function calendarDay(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function inventoryAge(
  vehicle: AdminVehicle,
  now = new Date(),
): number | null {
  const created = validDate(vehicle.CREATED_AT);
  return created && created <= now
    ? Math.floor((now.getTime() - created.getTime()) / DAY)
    : null;
}
export function attentionReasons(
  vehicle: AdminVehicle,
  now = new Date(),
): string[] {
  if (vehicle.VEHICLE_STATUS !== "AVAILABLE") return [];
  const reasons: string[] = [];
  if (Number(vehicle.PHOTO_COUNT) === 0) reasons.push("Missing photos");
  else if (!vehicle.PRIMARY_IMAGE_URL) reasons.push("Choose a cover photo");
  if (vehicle.PUBLIC_YN !== "Y") reasons.push("Hidden from website");
  if (vehicle.ASKING_PRICE == null || Number(vehicle.ASKING_PRICE) <= 0)
    reasons.push("Add an asking price");
  const age = inventoryAge(vehicle, now);
  if (age != null && age >= 60) reasons.push(`${age} days in inventory`);
  return reasons;
}
/** Current sold inventory, dated by its latest genuine SOLD transition.
 * Reopened/archived vehicles are excluded; UPDATED_AT is never a sale date.
 */
export function dealerMetrics(
  vehicles: AdminVehicle[],
  now = new Date(),
  timeZone = REPORTING_TIME_ZONE,
) {
  const today = calendarDay(now, timeZone);
  const month = today.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const previousMonth = new Date(Date.UTC(year, monthNumber - 2, 1))
    .toISOString()
    .slice(0, 7);
  const dayUTC = new Date(`${today}T00:00:00Z`);
  const monday = new Date(
    dayUTC.getTime() - ((dayUTC.getUTCDay() + 6) % 7) * DAY,
  )
    .toISOString()
    .slice(0, 10);
  const active = vehicles.filter((v) => v.VEHICLE_STATUS === "AVAILABLE");
  const sold = vehicles.filter((v) => v.VEHICLE_STATUS === "SOLD");
  const datedSold = sold.flatMap((vehicle) => {
    const date = validDate(vehicle.SOLD_AT);
    return date && date <= now
      ? [{ vehicle, date, day: calendarDay(date, timeZone) }]
      : [];
  });
  const thisMonthSales = datedSold.filter((v) => v.day.startsWith(month));
  const lastMonthSales = datedSold.filter((v) =>
    v.day.startsWith(previousMonth),
  );
  const thisWeekSales = datedSold.filter(
    (v) => v.day >= monday && v.day <= today,
  );
  const ages = active
    .map((v) => inventoryAge(v, now))
    .filter((v): v is number => v != null);
  const durations = thisMonthSales.flatMap(({ vehicle, date }) => {
    const created = validDate(vehicle.CREATED_AT);
    return created && created <= date
      ? [(date.getTime() - created.getTime()) / DAY]
      : [];
  });
  const monthRows = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 6 + index, 1));
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
      }).format(date),
      added: vehicles.filter((v) => {
        const created = validDate(v.CREATED_AT);
        return (
          created &&
          created <= now &&
          calendarDay(created, timeZone).startsWith(key)
        );
      }).length,
      sold: datedSold.filter((v) => v.day.startsWith(key)).length,
    };
  });
  return {
    month,
    previousMonth,
    active,
    sold,
    monthRows,
    thisMonth: thisMonthSales.length,
    lastMonth: lastMonthSales.length,
    thisWeek: thisWeekSales.length,
    undatedSold: sold.length - datedSold.length,
    addedThisMonth: monthRows[5].added,
    missingPhotos: active.filter((v) => Number(v.PHOTO_COUNT) === 0).length,
    hidden: active.filter((v) => v.PUBLIC_YN !== "Y").length,
    aging: ages.filter((age) => age >= 60).length,
    unknownAge: active.length - ages.length,
    ageBuckets: [
      ages.filter((age) => age < 30).length,
      ages.filter((age) => age >= 30 && age < 60).length,
      ages.filter((age) => age >= 60 && age < 90).length,
      ages.filter((age) => age >= 90).length,
    ],
    averageDaysToSell: durations.length
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : null,
    averageDaysSample: durations.length,
    soldAskingValue: thisMonthSales.reduce(
      (sum, { vehicle }) =>
        sum +
        (Number(vehicle.ASKING_PRICE) > 0 ? Number(vehicle.ASKING_PRICE) : 0),
      0,
    ),
    soldMissingPrice: thisMonthSales.filter(
      ({ vehicle }) => !(Number(vehicle.ASKING_PRICE) > 0),
    ).length,
    attention: active
      .map((vehicle) => ({ vehicle, reasons: attentionReasons(vehicle, now) }))
      .filter((v) => v.reasons.length)
      .sort(
        (a, b) =>
          b.reasons.length - a.reasons.length ||
          (inventoryAge(b.vehicle, now) ?? -1) -
            (inventoryAge(a.vehicle, now) ?? -1),
      ),
  };
}
