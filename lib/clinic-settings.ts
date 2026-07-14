import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clinicSettings,
  doctorDetails,
  doctorSchedules,
  practiceSessions,
  users,
} from "@/db/schema";
import { getClinicClockParts } from "@/lib/clinic-time";

export const defaultClinicSettings = {
  clinicName: "Klinik Borneo Kasih",
  address:
    "Jl. RTA Milono No.KM. 1,5, Langkai, Kec. Pahandut, Kota Palangka Raya, Kalimantan Tengah 73111",
  phone: "0541-123456",
  email: "info@borneokasih.com",
  morningStart: "07:30",
  morningEnd: "12:00",
  eveningStart: "17:00",
  eveningEnd: "21:00",
  enableStrictCheckIn: false,
  checkInEarlyMinutes: 120,
  checkInLateMinutes: 60,
  enableAutoCancel: false,
  autoCancelGraceMinutes: 30,
};

export async function getOrCreateClinicSettings() {
  const existing = await db.query.clinicSettings.findFirst({
    orderBy: [asc(clinicSettings.id)],
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(clinicSettings)
    .values({
      ...defaultClinicSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export interface DoctorOperatingHours {
  doctorId: number;
  doctorName: string;
  specialization: string | null;
  daySummary: string;
  sessions: Array<{
    sessionName: string;
    startTime: string;
    endTime: string;
  }>;
  displayText: string;
  scheduleGroups: Array<{
    daySummary: string;
    sessions: Array<{
      sessionName: string;
      startTime: string;
      endTime: string;
    }>;
    displayText: string;
  }>;
}

const dayNames = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

function formatDaySummary(days: number[]) {
  const uniqueDays = Array.from(new Set(days)).sort((a, b) => a - b);

  if (uniqueDays.join(",") === "0,1,2,3,4,5,6") return "Setiap hari";
  if (uniqueDays.join(",") === "1,2,3,4,5,6") return "Senin-Sabtu";
  if (uniqueDays.join(",") === "1,2,3,4,5") return "Senin-Jumat";

  const isContiguous = uniqueDays.every(
    (day, index) => index === 0 || day === uniqueDays[index - 1] + 1
  );

  if (isContiguous && uniqueDays.length > 1) {
    return `${dayNames[uniqueDays[0]]}-${dayNames[uniqueDays[uniqueDays.length - 1]]}`;
  }

  return uniqueDays.map((day) => dayNames[day]).join(", ");
}

function formatClockWithZone(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const { hour, minute } = getClinicClockParts(date);

  return `${String(hour).padStart(2, "0")}.${String(minute).padStart(2, "0")} WIB`;
}

function getSortTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatSessionDisplay(session: {
  sessionName: string;
  startTime: string;
  endTime: string;
}) {
  return `${session.sessionName} (${session.startTime} - ${session.endTime})`;
}

export async function getDoctorOperatingHours(): Promise<DoctorOperatingHours[]> {
  const rows = await db
    .select({
      doctorId: doctorDetails.userId,
      doctorName: doctorDetails.name,
      specialization: doctorDetails.specialization,
      sessionName: practiceSessions.name,
      startTime: practiceSessions.startTime,
      endTime: practiceSessions.endTime,
      dayOfWeek: doctorSchedules.dayOfWeek,
    })
    .from(doctorSchedules)
    .innerJoin(
      practiceSessions,
      eq(doctorSchedules.sessionId, practiceSessions.id)
    )
    .innerJoin(doctorDetails, eq(doctorSchedules.doctorId, doctorDetails.userId))
    .innerJoin(users, eq(doctorDetails.userId, users.id))
    .where(
      and(
        eq(users.role, "Doctor"),
        eq(users.status, "Active"),
        eq(doctorSchedules.isActive, true),
        isNull(users.deletedAt),
        isNull(doctorSchedules.deletedAt),
        isNull(practiceSessions.deletedAt)
      )
    )
    .orderBy(
      asc(doctorDetails.name),
      asc(doctorSchedules.dayOfWeek),
      asc(practiceSessions.startTime)
    );

  const doctors = new Map<
    number,
    {
      doctorName: string;
      specialization: string | null;
      daySessions: Map<
        number,
        Map<
          string,
          {
            sessionName: string;
            startTime: string;
            endTime: string;
            sortTime: number;
          }
        >
      >;
      allSessions: Map<
        string,
        {
          sessionName: string;
          startTime: string;
          endTime: string;
          sortTime: number;
        }
      >;
    }
  >();

  for (const row of rows) {
    const doctor = doctors.get(row.doctorId) ?? {
      doctorName: row.doctorName,
      specialization: row.specialization,
      daySessions: new Map(),
      allSessions: new Map(),
    };

    const startTime = formatClockWithZone(row.startTime);
    const endTime = formatClockWithZone(row.endTime);
    const sessionKey = `${row.sessionName}-${startTime}-${endTime}`;
    const session = {
      sessionName: row.sessionName,
      startTime,
      endTime,
      sortTime: getSortTime(row.startTime),
    };

    const sessionsForDay =
      doctor.daySessions.get(row.dayOfWeek) ?? new Map<typeof sessionKey, typeof session>();

    if (!sessionsForDay.has(sessionKey)) {
      sessionsForDay.set(sessionKey, session);
    }

    if (!doctor.allSessions.has(sessionKey)) {
      doctor.allSessions.set(sessionKey, session);
    }

    doctor.daySessions.set(row.dayOfWeek, sessionsForDay);
    doctors.set(row.doctorId, doctor);
  }

  return Array.from(doctors.entries()).map(([doctorId, doctor]) => {
    const sessions = Array.from(doctor.allSessions.values())
      .sort((a, b) => a.sortTime - b.sortTime)
      .map((session) => ({
        sessionName: session.sessionName,
        startTime: session.startTime,
        endTime: session.endTime,
      }));
    const daySessionGroups = new Map<
      string,
      {
        days: number[];
        firstDay: number;
        firstSortTime: number;
        sessions: Array<{
          sessionName: string;
          startTime: string;
          endTime: string;
          sortTime: number;
        }>;
      }
    >();

    for (const [dayOfWeek, sessionsForDay] of Array.from(
      doctor.daySessions.entries()
    ).sort(([leftDay], [rightDay]) => leftDay - rightDay)) {
      const sortedSessions = Array.from(sessionsForDay.values()).sort(
        (a, b) => a.sortTime - b.sortTime
      );
      const groupKey = sortedSessions
        .map(
          (session) =>
            `${session.sessionName}-${session.startTime}-${session.endTime}`
        )
        .join("|");
      const existing = daySessionGroups.get(groupKey);

      if (existing) {
        existing.days.push(dayOfWeek);
        existing.firstDay = Math.min(existing.firstDay, dayOfWeek);
      } else {
        daySessionGroups.set(groupKey, {
          days: [dayOfWeek],
          firstDay: dayOfWeek,
          firstSortTime: sortedSessions[0]?.sortTime ?? 0,
          sessions: sortedSessions,
        });
      }
    }

    const scheduleGroups = Array.from(daySessionGroups.values())
      .sort(
        (a, b) =>
          a.firstDay - b.firstDay || a.firstSortTime - b.firstSortTime
      )
      .map((group) => {
        const groupSessions = group.sessions.map((session) => ({
          sessionName: session.sessionName,
          startTime: session.startTime,
          endTime: session.endTime,
        }));

        return {
          daySummary: formatDaySummary(group.days),
          sessions: groupSessions,
          displayText: groupSessions.map(formatSessionDisplay).join(", "),
        };
      });
    const displayText = scheduleGroups
      .map((group) => `${group.daySummary}: ${group.displayText}`)
      .join("; ");

    return {
      doctorId,
      doctorName: doctor.doctorName,
      specialization: doctor.specialization,
      daySummary: formatDaySummary(
        Array.from(doctor.daySessions.keys())
      ),
      sessions,
      displayText,
      scheduleGroups,
    };
  });
}

export function formatClinicOperatingHours(settings: {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
}) {
  return `${settings.morningStart} WIB - ${settings.morningEnd} WIB dan ${settings.eveningStart} WIB - ${settings.eveningEnd} WIB`;
}
