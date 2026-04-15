import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

function buildLocalDayStart(date: Date, timezone: string) {
  return fromZonedTime(`${formatInTimeZone(date, timezone, "yyyy-MM-dd")} 00:00:00`, timezone);
}

export function getWeekdayNumber(date: Date, timezone: string) {
  return Number(formatInTimeZone(date, timezone, "i"));
}

export function getUpcomingSchoolWeekRange(now: Date, timezone: string) {
  const weekday = getWeekdayNumber(now, timezone);
  const daysUntilNextMonday = weekday === 1 ? 7 : 8 - weekday;
  const nextMonday = new Date(now);
  nextMonday.setDate(nextMonday.getDate() + daysUntilNextMonday);

  const nextFriday = new Date(nextMonday);
  nextFriday.setDate(nextFriday.getDate() + 4);

  return {
    start: buildLocalDayStart(nextMonday, timezone),
    end: fromZonedTime(`${formatInTimeZone(nextFriday, timezone, "yyyy-MM-dd")} 23:59:59`, timezone)
  };
}

