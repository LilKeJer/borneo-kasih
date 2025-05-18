// app/api/appointments/[id]/cancel/route.ts
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

    // Check if appointment can be cancelled (only pending and confirmed)
    if (
      appointment.status !== "Pending" &&
      appointment.status !== "Confirmed"
    ) {
      return NextResponse.json(
        { message: "Janji temu tidak dapat dibatalkan" },
        { status: 400 }
      );
    }

    // 1. Update the appointment status to Cancelled
    await db
      .update(reservations)
      .set({
        status: "Cancelled",
        examinationStatus: "Cancelled",
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, appointmentId));

    // 2. Decrease currentReservations in dailyScheduleStatuses
    if (appointment.scheduleId) {
      const appointmentDate = appointment.reservationDate;
      if (appointmentDate) {
        const formattedDate = new Date(appointmentDate)
          .toISOString()
          .split("T")[0];

        const dailyStatus = await db
          .select({
            id: dailyScheduleStatuses.id,
            currentReservations: dailyScheduleStatuses.currentReservations,
          })
          .from(dailyScheduleStatuses)
          .where(
            and(
              eq(dailyScheduleStatuses.scheduleId, appointment.scheduleId),
              eq(dailyScheduleStatuses.date, formattedDate)
            )
          );

        if (
          dailyStatus.length > 0 &&
          dailyStatus[0].currentReservations &&
          dailyStatus[0].currentReservations > 0
        ) {
          await db
            .update(dailyScheduleStatuses)
            .set({
              currentReservations: dailyStatus[0].currentReservations - 1,
            })
            .where(eq(dailyScheduleStatuses.id, dailyStatus[0].id));
        }
      }
    }

    return NextResponse.json({
      message: "Janji temu berhasil dibatalkan",
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
