export const CLINIC_TIME_ZONE = "Asia/Jakarta";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getDateTimeParts(date: Date, options: Intl.DateTimeFormatOptions) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CLINIC_TIME_ZONE,
      ...options,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
}

export function getClinicDateString(date = new Date()): string {
  const parts = getDateTimeParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getClinicNowParts(date = new Date()): {
  dayOfWeek: number;
  minutesSinceMidnight: number;
} {
  const parts = getDateTimeParts(date, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const rawHour = Number(parts.hour);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(parts.minute);

  return {
    dayOfWeek: WEEKDAY_INDEX[parts.weekday] ?? date.getDay(),
    minutesSinceMidnight: hour * 60 + minute,
  };
}

export function getClockMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isClockMinuteInRange(
  currentMinutes: number,
  startMinutes: number,
  endMinutes: number
): boolean {
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

export function isSessionActiveAt(params: {
  startTime: Date | null;
  endTime: Date | null;
  minutesSinceMidnight: number;
}): boolean {
  const { startTime, endTime, minutesSinceMidnight } = params;

  if (!startTime || !endTime) return false;

  return isClockMinuteInRange(
    minutesSinceMidnight,
    getClockMinutes(startTime),
    getClockMinutes(endTime)
  );
}
