// app/api/patients/today-appointment/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, doctorDetails } from "@/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);

    // Ambil tanggal hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Hitung akhir hari (hari berikutnya)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Cari janji temu untuk pasien hari ini
    const appointment = await db
      .select({
        id: reservations.id,
        doctorId: reservations.doctorId,
        doctorName: doctorDetails.name,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
      })
      .from(reservations)
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .where(
        and(
          eq(reservations.patientId, patientId),
          gte(reservations.reservationDate, today),
          lte(reservations.reservationDate, tomorrow),
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(reservations.reservationDate)
      .limit(1);

    if (appointment.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: appointment[0].id,
      doctorId: appointment[0].doctorId,
      doctor: appointment[0].doctorName || "Dokter",
      date: appointment[0].reservationDate,
      queueNumber: appointment[0].queueNumber,
      status: appointment[0].status,
      examinationStatus: appointment[0].examinationStatus || "Not Started",
    });
  } catch (error) {
    console.error("Error fetching today's appointment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
