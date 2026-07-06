// lib/utils/date.ts
import { CLINIC_TIME_ZONE, getClinicClockParts } from "@/lib/clinic-time";

type DateInput = Date | string | null | undefined;

function parseDate(date: DateInput): Date | null {
  if (!date) return null;

  const parsed = typeof date === "string" ? new Date(date) : date;
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(date: DateInput): string {
  const d = parseDate(date);
  if (!d) return "";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: DateInput): string {
  const d = parseDate(date);
  if (!d) return "";

  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatTime(date: DateInput): string {
  const d = parseDate(date);
  if (!d) return "";

  const { hour, minute } = getClinicClockParts(d);

  return `${String(hour).padStart(2, "0")}.${String(minute).padStart(
    2,
    "0"
  )} WIB`;
}

export function formatDateShort(date: DateInput): string {
  const d = parseDate(date);
  if (!d) return "";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTimeShort(date: DateInput): string {
  const d = parseDate(date);
  if (!d) return "";

  return `${formatDateShort(d)} ${formatTime(d)}`;
}

export function formatTimeRange(start: DateInput, end: DateInput): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatTimeInputPreview(date: DateInput): string {
  const d = parseDate(date);
  if (!d) return "";

  const { hour, minute } = getClinicClockParts(d);

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getRelativeTime(date: Date | string): string {
  const d = parseDate(date);
  if (!d) return "";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSecs < 60) {
    return "Baru saja";
  } else if (diffMins < 60) {
    return `${diffMins} menit yang lalu`;
  } else if (diffHours < 24) {
    return `${diffHours} jam yang lalu`;
  } else if (diffDays === 1) {
    return "Kemarin";
  } else if (diffDays < 30) {
    return `${diffDays} hari yang lalu`;
  } else {
    return formatDate(d);
  }
}

export function getDay(day: number): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  return days[day];
}
