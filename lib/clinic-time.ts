export const CLINIC_TIME_ZONE = "Asia/Jakarta";
export const CLINIC_UTC_OFFSET = "+07:00";

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

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}

export function getClinicDateString(date = new Date()): string {
  const parts = getDateTimeParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDaysToClinicDateString(
  dateString: string,
  days: number
): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
  ].join("-");
}

export function getClinicClockParts(date: Date): {
  hour: number;
  minute: number;
  second: number;
} {
  const parts = getDateTimeParts(date, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const hour = Number(parts.hour);

  return {
    hour: hour === 24 ? 0 : hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function createClinicDateTime(
  dateString: string,
  hour: number,
  minute: number,
  second = 0,
  millisecond = 0
): Date {
  const fraction = millisecond ? `.${pad3(millisecond)}` : "";
  return new Date(
    `${dateString}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}${fraction}${CLINIC_UTC_OFFSET}`
  );
}

export function createClinicDateTimeFromTimeInput(
  dateString: string,
  timeString: string
): Date | null {
  const [hourValue, minuteValue] = timeString.split(":").map(Number);

  if (
    !Number.isInteger(hourValue) ||
    !Number.isInteger(minuteValue) ||
    hourValue < 0 ||
    hourValue > 23 ||
    minuteValue < 0 ||
    minuteValue > 59
  ) {
    return null;
  }

  const date = createClinicDateTime(dateString, hourValue, minuteValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getClinicNowParts(date = new Date()): {
  dayOfWeek: number;
  minutesSinceMidnight: number;
} {
  const parts = getDateTimeParts(date, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
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
  const { hour, minute } = getClinicClockParts(date);
  return hour * 60 + minute;
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
