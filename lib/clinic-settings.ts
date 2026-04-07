import { asc } from "drizzle-orm";
import { db } from "@/db";
import { clinicSettings } from "@/db/schema";

export const defaultClinicSettings = {
  clinicName: "Klinik Borneo Kasih",
  address: "Jl. Klinik No. 123, Banjarmasin",
  phone: "0541-123456",
  email: "info@borneokasih.com",
  morningStart: "08:00",
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

export function formatClinicOperatingHours(settings: {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
}) {
  return `${settings.morningStart} - ${settings.morningEnd} dan ${settings.eveningStart} - ${settings.eveningEnd}`;
}
