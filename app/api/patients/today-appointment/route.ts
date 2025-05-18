// app/api/patients/today-appointment/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, doctorDetails } from "@/db/schema";
import { eq, and, isNull, gte, lte, not } from "drizzle-orm";

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

    // Pertama, cari appointment aktif hari ini yang belum selesai atau dibatalkan
    const activeAppointments = await db
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
          not(eq(reservations.status, "Cancelled")),
          not(eq(reservations.status, "Completed")),
          not(eq(reservations.examinationStatus, "Completed")),
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(reservations.reservationDate)
      .limit(5); // Ambil beberapa untuk memastikan

    // Jika ada appointment aktif, ambil yang pertama
    if (activeAppointments.length > 0) {
      console.log("Ditemukan appointment aktif:", activeAppointments[0]);

      return NextResponse.json({
        nextAppointment: {
          id: activeAppointments[0].id,
          doctorId: activeAppointments[0].doctorId,
          doctor: activeAppointments[0].doctorName || "Dokter",
          date: activeAppointments[0].reservationDate,
          queueNumber: activeAppointments[0].queueNumber,
          status: activeAppointments[0].status,
          examinationStatus:
            activeAppointments[0].examinationStatus || "Not Started",
        },
      });
    }

    // Jika tidak ada appointment aktif, cek appointment baru untuk hari ini
    // (ini untuk menangani kasus reservasi baru)
    const newAppointments = await db
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
          not(eq(reservations.status, "Cancelled")),
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(reservations.reservationDate)
      .limit(1);

    if (newAppointments.length > 0) {
      console.log("Ditemukan appointment lain:", newAppointments[0]);

      return NextResponse.json({
        nextAppointment: {
          id: newAppointments[0].id,
          doctorId: newAppointments[0].doctorId,
          doctor: newAppointments[0].doctorName || "Dokter",
          date: newAppointments[0].reservationDate,
          queueNumber: newAppointments[0].queueNumber,
          status: newAppointments[0].status,
          examinationStatus:
            newAppointments[0].examinationStatus || "Not Started",
        },
      });
    }

    // Tidak ada appointment untuk hari ini
    console.log("Tidak ada appointment aktif untuk hari ini");
    return NextResponse.json({ nextAppointment: null });
  } catch (error) {
    console.error("Error fetching today's appointment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
