import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  clinicSettings,
  dailyScheduleStatuses,
  doctorSchedules,
  practiceSessions,
  reservations,
} from "@/db/schema";
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  lte,
} from "drizzle-orm";
import {
  calculateNoShowDeadline,
  normalizeQueuePolicy,
  toDateOnlyLocal,
} from "@/lib/queue-policy";

function isAuthorized(req: NextRequest, secret: string): boolean {
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const fallbackHeader = req.headers.get("x-cron-secret");
  return fallbackHeader === secret;
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    if (!secret && isProduction) {
      return NextResponse.json(
        { message: "CRON_SECRET is not configured" },
        { status: 500 }
      );
    }

    if (secret && !isAuthorized(req, secret)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const rawSettings = await db.query.clinicSettings.findFirst({
      orderBy: [asc(clinicSettings.id)],
    });
    const policy = normalizeQueuePolicy(rawSettings);

    if (!policy.enableAutoCancel) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "Auto-cancel is disabled in clinic settings",
      });
    }

    const candidates = await db
      .select({
        id: reservations.id,
        scheduleId: reservations.scheduleId,
        reservationDate: reservations.reservationDate,
        sessionStartTime: practiceSessions.startTime,
        sessionEndTime: practiceSessions.endTime,
      })
      .from(reservations)
      .leftJoin(doctorSchedules, eq(reservations.scheduleId, doctorSchedules.id))
      .leftJoin(practiceSessions, eq(doctorSchedules.sessionId, practiceSessions.id))
      .where(
        and(
          inArray(reservations.status, ["Pending", "Confirmed"]),
          isNull(reservations.examinationStatus),
          lte(reservations.reservationDate, now),
          isNull(reservations.deletedAt)
        )
      );

    const reservationIdsToCancel: number[] = [];
    const decrementByScheduleDate = new Map<string, number>();

    for (const candidate of candidates) {
      const deadline = calculateNoShowDeadline({
        reservationDate: candidate.reservationDate,
        sessionStartTime: candidate.sessionStartTime,
        sessionEndTime: candidate.sessionEndTime,
        checkInLateMinutes: policy.checkInLateMinutes,
        autoCancelGraceMinutes: policy.autoCancelGraceMinutes,
      });

      if (now <= deadline) continue;

      reservationIdsToCancel.push(candidate.id);

      const key = `${candidate.scheduleId}|${toDateOnlyLocal(candidate.reservationDate)}`;
      decrementByScheduleDate.set(
        key,
        (decrementByScheduleDate.get(key) ?? 0) + 1
      );
    }

    if (reservationIdsToCancel.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: candidates.length,
        cancelled: 0,
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(reservations)
        .set({
          status: "Cancelled",
          examinationStatus: "Cancelled",
          cancellationReason: "NO_SHOW",
          updatedAt: now,
        })
        .where(inArray(reservations.id, reservationIdsToCancel));

      for (const [key, decrementCount] of decrementByScheduleDate) {
        const [scheduleIdText, date] = key.split("|");
        const scheduleId = Number(scheduleIdText);
        if (!Number.isFinite(scheduleId)) continue;

        const [dailyStatus] = await tx
          .select({
            id: dailyScheduleStatuses.id,
            currentReservations: dailyScheduleStatuses.currentReservations,
          })
          .from(dailyScheduleStatuses)
          .where(
            and(
              eq(dailyScheduleStatuses.scheduleId, scheduleId),
              eq(dailyScheduleStatuses.date, date)
            )
          )
          .limit(1);

        if (!dailyStatus) continue;

        const currentReservations = dailyStatus.currentReservations ?? 0;
        await tx
          .update(dailyScheduleStatuses)
          .set({
            currentReservations: Math.max(
              0,
              currentReservations - decrementCount
            ),
            updatedAt: now,
          })
          .where(eq(dailyScheduleStatuses.id, dailyStatus.id));
      }
    });

    return NextResponse.json({
      ok: true,
      processed: candidates.length,
      cancelled: reservationIdsToCancel.length,
      cancelledReservationIds: reservationIdsToCancel,
    });
  } catch (error) {
    console.error("Error running auto-cancel job:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
