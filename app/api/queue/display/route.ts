// app/api/queue/display/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  reservations,
  doctorDetails,
  doctorSchedules,
  practiceSessions,
} from "@/db/schema";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";

// Definisi tipe untuk item antrian
interface QueueItem {
  id: number;
  queueNumber: number | null;
  status: "Waiting" | "In Progress";
  reservationDate: Date;
  reservationStatus: string;
}

// Definisi tipe untuk pengelompokan
interface DoctorSessionGroup {
  doctorId: number | null;
  doctorName: string;
  sessionId: number | null;
  sessionName: string;

  queues: QueueItem[];
}

export async function GET() {
  try {
    // Ambil tanggal hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Hitung akhir hari (hari berikutnya)
    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    // Mendapatkan antrian untuk hari ini berdasarkan dokter dan sesi
    const queues = await db
      .select({
        id: reservations.id,
        doctorId: reservations.doctorId,
        doctorName: doctorDetails.name,
        scheduleId: reservations.scheduleId,
        sessionId: doctorSchedules.sessionId,
        sessionName: practiceSessions.name,
        queueNumber: reservations.queueNumber,
        examinationStatus: reservations.examinationStatus,
        status: reservations.status, // Tambahkan status reservasi
        reservationDate: reservations.reservationDate,
      })
      .from(reservations)
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .leftJoin(
        doctorSchedules,
        eq(reservations.scheduleId, doctorSchedules.id)
      )
      .leftJoin(
        practiceSessions,
        eq(doctorSchedules.sessionId, practiceSessions.id)
      )
      .where(
        and(
          gte(reservations.reservationDate, today),
          lte(reservations.reservationDate, nextDay),
          sql`${reservations.examinationStatus} IN ('Waiting', 'In Progress')`,
          sql`${reservations.status} IN ('Confirmed', 'Pending')`, // Tambahkan filter status
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(
        doctorDetails.name,
        practiceSessions.name,
        reservations.queueNumber
      );

    // Mengelompokkan antrian berdasarkan dokter dan sesi
    const queuesByDoctorAndSession = queues.reduce((result, queue) => {
      // Filter reservasi yang dibatalkan
      if (queue.status === "Cancelled") {
        return result;
      }

      // Buat key unik untuk kombinasi dokter dan sesi
      const key = `${queue.doctorId}-${queue.sessionId}`;

      if (!result[key]) {
        result[key] = {
          doctorId: queue.doctorId,
          doctorName: queue.doctorName || "Dokter",
          sessionId: queue.sessionId,
          sessionName: queue.sessionName || "Sesi Tidak Diketahui",
          queues: [],
        };
      }

      result[key].queues.push({
        id: queue.id,
        queueNumber: queue.queueNumber,
        status: queue.examinationStatus as "Waiting" | "In Progress",
        reservationStatus: queue.status, // Simpan status reservasi
        reservationDate: queue.reservationDate,
      });

      return result;
    }, {} as Record<string, DoctorSessionGroup>);

    return NextResponse.json({
      data: Object.values(queuesByDoctorAndSession),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching queue display data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
