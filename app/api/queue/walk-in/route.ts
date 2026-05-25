// app/api/queue/walk-in/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  reservations,
  dailyScheduleStatuses,
  doctorSchedules,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getClinicDateString } from "@/lib/clinic-time";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { patientId, doctorId, scheduleId } = body;
    const patientIdNumber = Number(patientId);
    const doctorIdNumber = Number(doctorId);
    const scheduleIdNumber = Number(scheduleId);

    if (
      !Number.isInteger(patientIdNumber) ||
      !Number.isInteger(doctorIdNumber) ||
      !Number.isInteger(scheduleIdNumber) ||
      patientIdNumber <= 0 ||
      doctorIdNumber <= 0 ||
      scheduleIdNumber <= 0
    ) {
      return NextResponse.json(
        { message: "Data pasien, dokter, dan jadwal wajib diisi" },
        { status: 400 }
      );
    }

    // Format tanggal hari ini
    const today = new Date();
    const formattedDate = getClinicDateString(today);

    // Cek jadwal dokter untuk memastikan jadwal valid dan aktif
    const doctorSchedule = await db
      .select({
        maxPatients: doctorSchedules.maxPatients,
      })
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.id, scheduleIdNumber),
          eq(doctorSchedules.doctorId, doctorIdNumber),
          eq(doctorSchedules.isActive, true)
        )
      );

    if (doctorSchedule.length === 0) {
      return NextResponse.json(
        { message: "Jadwal dokter tidak valid atau sedang tidak aktif" },
        { status: 400 }
      );
    }

    // Cek status jadwal harian
    const dailyStatus = await db
      .select({
        id: dailyScheduleStatuses.id,
        currentReservations: dailyScheduleStatuses.currentReservations,
      })
      .from(dailyScheduleStatuses)
      .where(
        and(
          eq(dailyScheduleStatuses.scheduleId, scheduleIdNumber),
          eq(dailyScheduleStatuses.date, formattedDate)
        )
      );

    const maxPatients = doctorSchedule[0]?.maxPatients || 30;

    // Jika jadwal harian belum ada, buat baru
    let currentReservations = 0;
    let dailyStatusId = null;

    if (dailyStatus.length > 0) {
      currentReservations = dailyStatus[0].currentReservations ?? 0;
      dailyStatusId = dailyStatus[0].id;

      // Cek kapasitas
      if (currentReservations >= maxPatients) {
        return NextResponse.json(
          { message: "Kapasitas dokter untuk hari ini sudah penuh" },
          { status: 400 }
        );
      }
    } else {
      // Buat status jadwal harian baru
      const [newStatus] = await db
        .insert(dailyScheduleStatuses)
        .values({
          scheduleId: scheduleIdNumber,
          date: formattedDate,
          isActive: true,
          currentReservations: 0,
        })
        .returning({ id: dailyScheduleStatuses.id });

      dailyStatusId = newStatus.id;
    }

    // Hitung nomor antrian
    const queueNumber = currentReservations + 1;

    // Buat reservasi baru dengan status langsung "Confirmed" dan "Waiting"
    const [newReservation] = await db
      .insert(reservations)
      .values({
        patientId: patientIdNumber,
        doctorId: doctorIdNumber,
        scheduleId: scheduleIdNumber,
        reservationDate: today,
        queueNumber,
        status: "Confirmed", // Walk-in langsung confirmed
        examinationStatus: "Waiting", // Dan langsung menunggu pemeriksaan
        cancellationReason: null,
        createdAt: today,
        updatedAt: today,
      })
      .returning({ id: reservations.id });

    // Update jumlah reservasi saat ini pada status jadwal harian
    await db
      .update(dailyScheduleStatuses)
      .set({
        currentReservations: queueNumber,
      })
      .where(eq(dailyScheduleStatuses.id, dailyStatusId));

    return NextResponse.json(
      {
        message: "Pendaftaran walk-in berhasil",
        id: newReservation.id,
        queueNumber,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating walk-in registration:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
