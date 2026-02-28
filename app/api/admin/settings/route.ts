// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { clinicSettings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { normalizeQueuePolicy } from "@/lib/queue-policy";

function parseBoolean(
  value: unknown,
  fallback: boolean
): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

const defaultSettings = {
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

async function getOrCreateSettings() {
  const existing = await db.query.clinicSettings.findFirst({
    orderBy: [asc(clinicSettings.id)],
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(clinicSettings)
    .values({
      ...defaultSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOrCreateSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const settings = await getOrCreateSettings();
    const queuePolicy = normalizeQueuePolicy({
      enableStrictCheckIn:
        body.enableStrictCheckIn !== undefined
          ? parseBoolean(body.enableStrictCheckIn, settings.enableStrictCheckIn)
          : settings.enableStrictCheckIn,
      checkInEarlyMinutes:
        body.checkInEarlyMinutes !== undefined
          ? Number(body.checkInEarlyMinutes)
          : settings.checkInEarlyMinutes,
      checkInLateMinutes:
        body.checkInLateMinutes !== undefined
          ? Number(body.checkInLateMinutes)
          : settings.checkInLateMinutes,
      enableAutoCancel:
        body.enableAutoCancel !== undefined
          ? parseBoolean(body.enableAutoCancel, settings.enableAutoCancel)
          : settings.enableAutoCancel,
      autoCancelGraceMinutes:
        body.autoCancelGraceMinutes !== undefined
          ? Number(body.autoCancelGraceMinutes)
          : settings.autoCancelGraceMinutes,
    });

    const updatedSettings = {
      clinicName:
        body.clinicName !== undefined ? body.clinicName : settings.clinicName,
      address: body.address !== undefined ? body.address : settings.address,
      phone: body.phone !== undefined ? body.phone : settings.phone,
      email: body.email !== undefined ? body.email : settings.email,
      morningStart:
        body.morningStart !== undefined
          ? body.morningStart
          : settings.morningStart,
      morningEnd:
        body.morningEnd !== undefined ? body.morningEnd : settings.morningEnd,
      eveningStart:
        body.eveningStart !== undefined
          ? body.eveningStart
          : settings.eveningStart,
      eveningEnd:
        body.eveningEnd !== undefined
          ? body.eveningEnd
          : settings.eveningEnd,
      enableStrictCheckIn: queuePolicy.enableStrictCheckIn,
      checkInEarlyMinutes: queuePolicy.checkInEarlyMinutes,
      checkInLateMinutes: queuePolicy.checkInLateMinutes,
      enableAutoCancel: queuePolicy.enableAutoCancel,
      autoCancelGraceMinutes: queuePolicy.autoCancelGraceMinutes,
    };

    // Validasi input
    if (
      !updatedSettings.clinicName ||
      !updatedSettings.address ||
      !updatedSettings.phone ||
      !updatedSettings.email
    ) {
      return NextResponse.json(
        { message: "All clinic information fields are required" },
        { status: 400 }
      );
    }

    const [saved] = await db
      .update(clinicSettings)
      .set({
        ...updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(clinicSettings.id, settings.id))
      .returning();

    return NextResponse.json({
      message: "Settings updated successfully",
      data: saved,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
