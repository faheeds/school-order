import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

function buildLocalDayStart(date: Date, timezone: string) {
  return fromZonedTime(`${formatInTimeZone(date, timezone, "yyyy-MM-dd")} 00:00:00`, timezone);
}

function buildLocalDayEnd(date: Date, timezone: string) {
  return fromZonedTime(`${formatInTimeZone(date, timezone, "yyyy-MM-dd")} 23:59:59`, timezone);
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
    end: buildLocalDayEnd(nextFriday, timezone)
  };
}

// Used by the parent "Upcoming week planner": include any still-orderable delivery dates
// for the remainder of the current week, plus the next school week.
export function getUpcomingOrderingWindowRange(now: Date, timezone: string) {
  const weekday = getWeekdayNumber(now, timezone);
  const daysUntilNextMonday = weekday === 1 ? 7 : 8 - weekday;
  const nextMonday = new Date(now);
  nextMonday.setDate(nextMonday.getDate() + daysUntilNextMonday);

  const nextFriday = new Date(nextMonday);
  nextFriday.setDate(nextFriday.getDate() + 4);

  return {
    start: buildLocalDayStart(now, timezone),
    end: buildLocalDayEnd(nextFriday, timezone)
  };
}

