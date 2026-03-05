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
import { and, asc, eq, gte, isNull, lte, not } from "drizzle-orm";
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

    const rawSettings = await db.query.clinicSettings.findFirst({
      orderBy: [asc(clinicSettings.id)],
    });
    const queuePolicy = normalizeQueuePolicy(rawSettings);

    const now = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeAppointments = await db
      .select({
        id: reservations.id,
        doctorId: reservations.doctorId,
        doctorName: doctorDetails.name,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
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
        and(
          eq(reservations.patientId, patientId),
          gte(reservations.reservationDate, today),
          lte(reservations.reservationDate, tomorrow),
          not(eq(reservations.status, "Cancelled")),
          not(eq(reservations.status, "Completed")),
          not(eq(reservations.examinationStatus, "Completed")),
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(reservations.reservationDate)
      .limit(5);

    if (activeAppointments.length > 0) {
      const current = activeAppointments[0];

      const normalizedExamStatus = current.examinationStatus || "Not Started";
      const canCheckInByStatus =
        (current.status === "Confirmed" || current.status === "Pending") &&
        !CHECK_IN_BLOCKED_EXAM_STATUSES.has(normalizedExamStatus);

      const checkInWindow = calculateCheckInWindow({
        reservationDate: current.reservationDate,
        policy: queuePolicy,
      });

      const noShowDeadline = calculateNoShowDeadline({
        reservationDate: current.reservationDate,
        sessionStartTime: current.sessionStartTime,
        sessionEndTime: current.sessionEndTime,
        checkInLateMinutes: queuePolicy.checkInLateMinutes,
        autoCancelGraceMinutes: queuePolicy.autoCancelGraceMinutes,
      });

      const isBeforeCheckInWindow = now < checkInWindow.startsAt;
      const isAfterCheckInWindow = now > checkInWindow.endsAt;
      const isCheckInWindowClosed =
        queuePolicy.enableStrictCheckIn && isAfterCheckInWindow;
      const isPastNoShowDeadline = now > noShowDeadline;
      const isAwaitingAutoCancel =
        queuePolicy.enableAutoCancel &&
        canCheckInByStatus &&
        isPastNoShowDeadline &&
        current.status !== "Cancelled";
      const canCheckInNow =
        canCheckInByStatus &&
        !isAwaitingAutoCancel &&
        (!queuePolicy.enableStrictCheckIn ||
          (!isBeforeCheckInWindow && !isAfterCheckInWindow));

      let uiStatusHint: string | null = null;
      if (isAwaitingAutoCancel) {
        uiStatusHint = "NO_SHOW_PENDING_AUTO_CANCEL";
      } else if (isCheckInWindowClosed && canCheckInByStatus) {
        uiStatusHint = "CHECK_IN_WINDOW_CLOSED";
      } else if (
        canCheckInByStatus &&
        queuePolicy.enableStrictCheckIn &&
        isBeforeCheckInWindow
      ) {
        uiStatusHint = "CHECK_IN_NOT_OPENED";
      }

      return NextResponse.json({
        nextAppointment: {
          id: current.id,
          doctorId: current.doctorId,
          doctor: current.doctorName || "Dokter",
          date: current.reservationDate,
          queueNumber: current.queueNumber,
          status: current.status,
          examinationStatus: normalizedExamStatus,
          canCheckInNow,
          uiStatusHint,
          checkInWindowStartsAt: checkInWindow.startsAt.toISOString(),
          checkInWindowEndsAt: checkInWindow.endsAt.toISOString(),
          noShowDeadline: noShowDeadline.toISOString(),
          isBeforeCheckInWindow:
            queuePolicy.enableStrictCheckIn && isBeforeCheckInWindow,
          isAfterCheckInWindow:
            queuePolicy.enableStrictCheckIn && isAfterCheckInWindow,
          isAwaitingAutoCancel,
          queuePolicy: {
            enableStrictCheckIn: queuePolicy.enableStrictCheckIn,
            enableAutoCancel: queuePolicy.enableAutoCancel,
          },
        },
      });
    }

    const newAppointments = await db
      .select({
        id: reservations.id,
        doctorId: reservations.doctorId,
        doctorName: doctorDetails.name,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
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
        and(
          eq(reservations.patientId, patientId),
          gte(reservations.reservationDate, today),
          lte(reservations.reservationDate, tomorrow),
          not(eq(reservations.status, "Cancelled")),
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(reservations.reservationDate)
      .limit(1);

    if (newAppointments.length > 0) {
      const current = newAppointments[0];
      const normalizedExamStatus = current.examinationStatus || "Not Started";

      const checkInWindow = calculateCheckInWindow({
        reservationDate: current.reservationDate,
        policy: queuePolicy,
      });

      const noShowDeadline = calculateNoShowDeadline({
        reservationDate: current.reservationDate,
        sessionStartTime: current.sessionStartTime,
        sessionEndTime: current.sessionEndTime,
        checkInLateMinutes: queuePolicy.checkInLateMinutes,
        autoCancelGraceMinutes: queuePolicy.autoCancelGraceMinutes,
      });

      const canCheckInByStatus =
        (current.status === "Confirmed" || current.status === "Pending") &&
        !CHECK_IN_BLOCKED_EXAM_STATUSES.has(normalizedExamStatus);
      const isBeforeCheckInWindow = now < checkInWindow.startsAt;
      const isAfterCheckInWindow = now > checkInWindow.endsAt;
      const isPastNoShowDeadline = now > noShowDeadline;
      const isAwaitingAutoCancel =
        queuePolicy.enableAutoCancel &&
        canCheckInByStatus &&
        isPastNoShowDeadline &&
        current.status !== "Cancelled";
      const canCheckInNow =
        canCheckInByStatus &&
        !isAwaitingAutoCancel &&
        (!queuePolicy.enableStrictCheckIn ||
          (!isBeforeCheckInWindow && !isAfterCheckInWindow));

      let uiStatusHint: string | null = null;
      if (canCheckInByStatus && isAwaitingAutoCancel) {
        uiStatusHint = "NO_SHOW_PENDING_AUTO_CANCEL";
      } else if (
        canCheckInByStatus &&
        queuePolicy.enableStrictCheckIn &&
        isAfterCheckInWindow
      ) {
        uiStatusHint = "CHECK_IN_WINDOW_CLOSED";
      } else if (
        canCheckInByStatus &&
        queuePolicy.enableStrictCheckIn &&
        isBeforeCheckInWindow
      ) {
        uiStatusHint = "CHECK_IN_NOT_OPENED";
      }

      return NextResponse.json({
        nextAppointment: {
          id: current.id,
          doctorId: current.doctorId,
          doctor: current.doctorName || "Dokter",
          date: current.reservationDate,
          queueNumber: current.queueNumber,
          status: current.status,
          examinationStatus: normalizedExamStatus,
          canCheckInNow,
          uiStatusHint,
          checkInWindowStartsAt: checkInWindow.startsAt.toISOString(),
          checkInWindowEndsAt: checkInWindow.endsAt.toISOString(),
          noShowDeadline: noShowDeadline.toISOString(),
          isBeforeCheckInWindow:
            queuePolicy.enableStrictCheckIn && isBeforeCheckInWindow,
          isAfterCheckInWindow:
            queuePolicy.enableStrictCheckIn && isAfterCheckInWindow,
          isAwaitingAutoCancel,
          queuePolicy: {
            enableStrictCheckIn: queuePolicy.enableStrictCheckIn,
            enableAutoCancel: queuePolicy.enableAutoCancel,
          },
        },
      });
    }

    return NextResponse.json({ nextAppointment: null });
  } catch (error) {
    console.error("Error fetching today's appointment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
