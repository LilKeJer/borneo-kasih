// app/api/queue/checkin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  clinicSettings,
  doctorSchedules,
  practiceSessions,
  reservations,
} from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { calculateCheckInWindow, normalizeQueuePolicy } from "@/lib/queue-policy";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Receptionist", "Admin", "Patient"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reservationId } = body;
    const reservationIdNumber = Number(reservationId);

    if (!reservationId || Number.isNaN(reservationIdNumber)) {
      return NextResponse.json(
        { message: "ID reservasi diperlukan" },
        { status: 400 }
      );
    }

    // Dapatkan reservasi + data sesi untuk strict check-in window.
    const reservationRows = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        status: reservations.status,
        reservationDate: reservations.reservationDate,
        sessionStartTime: practiceSessions.startTime,
        sessionEndTime: practiceSessions.endTime,
      })
      .from(reservations)
      .leftJoin(doctorSchedules, eq(reservations.scheduleId, doctorSchedules.id))
      .leftJoin(
        practiceSessions,
        eq(doctorSchedules.sessionId, practiceSessions.id)
      )
      .where(
        and(
          eq(reservations.id, reservationIdNumber),
          isNull(reservations.deletedAt)
        )
      )
      .limit(1);

    const reservation = reservationRows[0];

    if (!reservation) {
      return NextResponse.json(
        { message: "Reservasi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verifikasi kepemilikan untuk pasien
    if (
      session.user.role === "Patient" &&
      reservation.patientId !== parseInt(session.user.id)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verifikasi status reservasi
    if (
      reservation.status !== "Confirmed" &&
      reservation.status !== "Pending"
    ) {
      return NextResponse.json(
        {
          message:
            "Hanya reservasi dengan status Confirmed atau Pending yang dapat di-checkin",
        },
        { status: 400 }
      );
    }

    const rawSettings = await db.query.clinicSettings.findFirst({
      orderBy: [asc(clinicSettings.id)],
    });
    const queuePolicy = normalizeQueuePolicy(rawSettings);

    if (queuePolicy.enableStrictCheckIn) {
      const now = new Date();
      const { startsAt, endsAt } = calculateCheckInWindow({
        reservationDate: reservation.reservationDate,
        sessionStartTime: reservation.sessionStartTime,
        sessionEndTime: reservation.sessionEndTime,
        policy: queuePolicy,
      });

      if (now < startsAt) {
        return NextResponse.json(
          {
            message: "Belum masuk waktu check-in untuk janji temu ini",
            windowStartsAt: startsAt.toISOString(),
            windowEndsAt: endsAt.toISOString(),
          },
          { status: 400 }
        );
      }

      if (now > endsAt) {
        return NextResponse.json(
          {
            message:
              "Waktu check-in sudah lewat. Janji temu ini dianggap no-show.",
            windowStartsAt: startsAt.toISOString(),
            windowEndsAt: endsAt.toISOString(),
          },
          { status: 400 }
        );
      }
    }

    // Update status reservasi dan status pemeriksaan
    await db
      .update(reservations)
      .set({
        status: "Confirmed",
        examinationStatus: "Waiting",
        cancellationReason: null,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, reservationIdNumber));

    return NextResponse.json({
      message: "Check-in pasien berhasil",
      reservationId: reservationIdNumber,
    });
  } catch (error) {
    console.error("Error checking in patient:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
