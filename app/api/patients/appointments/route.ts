// app/api/patient/appointments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, doctorDetails } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);

    // Ambil janji temu pasien beserta informasi dokter
    const patientAppointments = await db
      .select({
        id: reservations.id,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
        doctorName: doctorDetails.name,
      })
      .from(reservations)
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .where(
        and(eq(reservations.patientId, patientId), isNull(reservations.deletedAt))
      )
      .orderBy(desc(reservations.reservationDate));

    return NextResponse.json(
      patientAppointments.map((appointment) => ({
        id: appointment.id,
        date: appointment.reservationDate,
        queueNumber: appointment.queueNumber,
        status: appointment.status,
        examinationStatus: appointment.examinationStatus || "Not Started",
        doctor: appointment.doctorName || "Dokter",
      }))
    );
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
