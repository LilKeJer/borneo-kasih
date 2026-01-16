// app/api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, doctorDetails } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    const appointmentId = parseInt(resolvedParams.id);
    const userId = parseInt(session.user.id);

    // Retrieve the appointment with doctor details
    const appointment = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        doctorId: reservations.doctorId,
        scheduleId: reservations.scheduleId,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
        complaint: reservations.complaint,
        doctorName: doctorDetails.name,
      })
      .from(reservations)
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .where(
        and(eq(reservations.id, appointmentId), isNull(reservations.deletedAt))
      )
      .limit(1);

    if (appointment.length === 0) {
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify ownership or access right
    if (
      session.user.role === "Patient" &&
      appointment[0].patientId !== userId
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: appointment[0].id,
      doctorId: appointment[0].doctorId,
      scheduleId: appointment[0].scheduleId,
      date: appointment[0].reservationDate,
      queueNumber: appointment[0].queueNumber,
      status: appointment[0].status,
      examinationStatus: appointment[0].examinationStatus || "Not Started", // Tambahkan ini jika belum ada
      doctor: appointment[0].doctorName || "Unknown Doctor",
      complaint: appointment[0].complaint || null,
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
