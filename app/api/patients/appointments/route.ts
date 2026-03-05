// app/api/patient/appointments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  clinicSettings,
  doctorDetails,
  doctorSchedules,
  practiceSessions,
  reservations,
} from "@/db/schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  calculateCheckInWindow,
  calculateNoShowDeadline,
  normalizeQueuePolicy,
} from "@/lib/queue-policy";

const CHECK_IN_BLOCKED_EXAM_STATUSES = new Set([
  "Waiting",
  "In Progress",
  "Waiting for Payment",
  "Completed",
  "Cancelled",
]);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);
    const now = new Date();
    const rawSettings = await db.query.clinicSettings.findFirst({
      orderBy: [asc(clinicSettings.id)],
    });
    const queuePolicy = normalizeQueuePolicy(rawSettings);

    const patientAppointments = await db
      .select({
        id: reservations.id,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
        doctorName: doctorDetails.name,
        sessionStartTime: practiceSessions.startTime,
        sessionEndTime: practiceSessions.endTime,
      })
      .from(reservations)
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .leftJoin(doctorSchedules, eq(reservations.scheduleId, doctorSchedules.id))
      .leftJoin(
        practiceSessions,
        eq(doctorSchedules.sessionId, practiceSessions.id)
      )
      .where(
        and(eq(reservations.patientId, patientId), isNull(reservations.deletedAt))
      )
      .orderBy(desc(reservations.reservationDate));

    return NextResponse.json(
      patientAppointments.map((appointment) => {
        const normalizedExamStatus =
          appointment.examinationStatus || "Not Started";
        const canCheckInByStatus =
          (appointment.status === "Confirmed" ||
            appointment.status === "Pending") &&
          !CHECK_IN_BLOCKED_EXAM_STATUSES.has(normalizedExamStatus);

        const checkInWindow = calculateCheckInWindow({
          reservationDate: appointment.reservationDate,
          policy: queuePolicy,
        });

        const noShowDeadline = calculateNoShowDeadline({
          reservationDate: appointment.reservationDate,
          sessionStartTime: appointment.sessionStartTime,
          sessionEndTime: appointment.sessionEndTime,
          checkInLateMinutes: queuePolicy.checkInLateMinutes,
          autoCancelGraceMinutes: queuePolicy.autoCancelGraceMinutes,
        });

        const isBeforeCheckInWindow = now < checkInWindow.startsAt;
        const isAfterCheckInWindow = now > checkInWindow.endsAt;
        const isPastNoShowDeadline = now > noShowDeadline;
        const isAwaitingAutoCancel =
          queuePolicy.enableAutoCancel &&
          canCheckInByStatus &&
          isPastNoShowDeadline &&
          appointment.status !== "Cancelled";
        const canCheckInNow =
          canCheckInByStatus &&
          !isAwaitingAutoCancel &&
          (!queuePolicy.enableStrictCheckIn ||
            (!isBeforeCheckInWindow && !isAfterCheckInWindow));

        let uiStatusHint: string | null = null;
        if (isAwaitingAutoCancel) {
          uiStatusHint = "NO_SHOW_PENDING_AUTO_CANCEL";
        } else if (queuePolicy.enableStrictCheckIn && isAfterCheckInWindow) {
          uiStatusHint = "CHECK_IN_WINDOW_CLOSED";
        } else if (queuePolicy.enableStrictCheckIn && isBeforeCheckInWindow) {
          uiStatusHint = "CHECK_IN_NOT_OPENED";
        }

        return {
          id: appointment.id,
          date: appointment.reservationDate,
          queueNumber: appointment.queueNumber,
          status: appointment.status,
          examinationStatus: normalizedExamStatus,
          doctor: appointment.doctorName || "Dokter",
          canCheckInNow,
          uiStatusHint,
        };
      })
    );
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
