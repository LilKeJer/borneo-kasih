// app/api/appointments/[id]/reschedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, dailyScheduleStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);
    const resolvedParams = await params;
    const appointmentId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { scheduleId, appointmentDate } = body;

    if (!scheduleId || !appointmentDate) {
      return NextResponse.json(
        { message: "Data jadwal baru tidak lengkap" },
        { status: 400 }
      );
    }

    // Verify the appointment belongs to the patient
    const appointment = await db.query.reservations.findFirst({
      where: and(
        eq(reservations.id, appointmentId),
        eq(reservations.patientId, patientId)
      ),
    });

    if (!appointment) {
      return NextResponse.json(
        { message: "Janji temu tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if appointment can be rescheduled (only pending and confirmed)
    if (
      appointment.status !== "Pending" &&
      appointment.status !== "Confirmed"
    ) {
      return NextResponse.json(
        { message: "Janji temu tidak dapat dijadwalkan ulang" },
        { status: 400 }
      );
    }

    // 1. Decrease currentReservations in OLD dailyScheduleStatuses
    if (appointment.scheduleId) {
      const oldAppointmentDate = appointment.reservationDate;
      if (oldAppointmentDate) {
        const oldFormattedDate = new Date(oldAppointmentDate)
          .toISOString()
          .split("T")[0];

        const oldDailyStatus = await db
          .select({
            id: dailyScheduleStatuses.id,
            currentReservations: dailyScheduleStatuses.currentReservations,
          })
          .from(dailyScheduleStatuses)
          .where(
            and(
              eq(dailyScheduleStatuses.scheduleId, appointment.scheduleId),
              eq(dailyScheduleStatuses.date, oldFormattedDate)
            )
          );

        if (
          oldDailyStatus.length > 0 &&
          oldDailyStatus[0].currentReservations &&
          oldDailyStatus[0].currentReservations > 0
        ) {
          await db
            .update(dailyScheduleStatuses)
            .set({
              currentReservations: oldDailyStatus[0].currentReservations - 1,
            })
            .where(eq(dailyScheduleStatuses.id, oldDailyStatus[0].id));
        }
      }
    }

    // 2. Increase or create currentReservations in NEW dailyScheduleStatuses
    const newScheduleDateObj = new Date(appointmentDate);
    const newFormattedDate = newScheduleDateObj.toISOString().split("T")[0];

    // Check NEW daily schedule status
    const newDailyStatus = await db
      .select({
        id: dailyScheduleStatuses.id,
        currentReservations: dailyScheduleStatuses.currentReservations,
      })
      .from(dailyScheduleStatuses)
      .where(
        and(
          eq(dailyScheduleStatuses.scheduleId, scheduleId),
          eq(dailyScheduleStatuses.date, newFormattedDate)
        )
      );

    let currentReservations = 0;
    let dailyStatusId = null;

    if (newDailyStatus.length > 0) {
      currentReservations = newDailyStatus[0].currentReservations ?? 0;
      dailyStatusId = newDailyStatus[0].id;
    } else {
      // Create new daily schedule status
      const [newStatus] = await db
        .insert(dailyScheduleStatuses)
        .values({
          scheduleId: scheduleId,
          date: newFormattedDate,
          isActive: true,
          currentReservations: 0,
        })
        .returning({ id: dailyScheduleStatuses.id });

      dailyStatusId = newStatus.id;
    }

    // Calculate new queue number
    const queueNumber = currentReservations + 1;

    // 3. Update the appointment with new schedule
    await db
      .update(reservations)
      .set({
        scheduleId,
        reservationDate: newScheduleDateObj,
        queueNumber,
        status: "Pending", // Reset to pending as it needs to be confirmed again
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, appointmentId));

    // 4. Update currentReservations in NEW dailyScheduleStatuses
    await db
      .update(dailyScheduleStatuses)
      .set({
        currentReservations: queueNumber,
      })
      .where(eq(dailyScheduleStatuses.id, dailyStatusId));

    return NextResponse.json({
      message: "Janji temu berhasil dijadwalkan ulang",
      newQueueNumber: queueNumber,
    });
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
