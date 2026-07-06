import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clinicSettings,
  doctorDetails,
  doctorSchedules,
  practiceSessions,
  users,
} from "@/db/schema";

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
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes} WIB`;
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
      days: Set<number>;
      sessions: Map<
        string,
        {
          sessionName: string;
          startTime: string;
          endTime: string;
          sortTime: Date;
        }
      >;
    }
  >();

  for (const row of rows) {
    const doctor = doctors.get(row.doctorId) ?? {
      doctorName: row.doctorName,
      specialization: row.specialization,
      days: new Set<number>(),
      sessions: new Map<
        string,
        {
          sessionName: string;
          startTime: string;
          endTime: string;
          sortTime: Date;
        }
      >(),
    };

    doctor.days.add(row.dayOfWeek);

    const startTime = formatClockWithZone(row.startTime);
    const endTime = formatClockWithZone(row.endTime);
    const sessionKey = `${row.sessionName}-${startTime}-${endTime}`;

    if (!doctor.sessions.has(sessionKey)) {
      doctor.sessions.set(sessionKey, {
        sessionName: row.sessionName,
        startTime,
        endTime,
        sortTime: row.startTime,
      });
    }

    doctors.set(row.doctorId, doctor);
  }

  return Array.from(doctors.entries()).map(([doctorId, doctor]) => {
    const sessions = Array.from(doctor.sessions.values())
      .sort((a, b) => a.sortTime.getTime() - b.sortTime.getTime())
      .map(({ sortTime, ...session }) => session);
    const displayText = sessions
      .map((session) => `${session.startTime} - ${session.endTime}`)
      .join(" dan ");

    return {
      doctorId,
      doctorName: doctor.doctorName,
      specialization: doctor.specialization,
      daySummary: formatDaySummary(Array.from(doctor.days)),
      sessions,
      displayText,
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
