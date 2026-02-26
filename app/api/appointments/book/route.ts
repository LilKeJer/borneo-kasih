// app/api/appointments/book/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, dailyScheduleStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);
    const body = await req.json();
    const { doctorId, scheduleId, appointmentDate, complaint } = body;

    if (!doctorId || !scheduleId || !appointmentDate) {
      return NextResponse.json(
        { message: "Semua data harus diisi" },
        { status: 400 }
      );
    }

    // Cek kuota jadwal harian
    const scheduleDateObj = new Date(appointmentDate);
    if (Number.isNaN(scheduleDateObj.getTime())) {
      return NextResponse.json(
        { message: "Tanggal janji temu tidak valid" },
        { status: 400 }
      );
    }

    const formattedDate = toDateOnly(scheduleDateObj);

    // Cek status jadwal harian
    const dailyStatus = await db
      .select({
        id: dailyScheduleStatuses.id,
        currentReservations: dailyScheduleStatuses.currentReservations,
      })
      .from(dailyScheduleStatuses)
      .where(
        and(
          eq(dailyScheduleStatuses.scheduleId, scheduleId),
          eq(dailyScheduleStatuses.date, formattedDate)
        )
      );

    // Jika jadwal belum memiliki status harian, buat baru
    let currentReservations = 0;
    let dailyStatusId = null;

    if (dailyStatus.length > 0) {
      currentReservations = dailyStatus[0].currentReservations ?? 0;
      dailyStatusId = dailyStatus[0].id;
    } else {
      // Buat status jadwal harian baru
      const [newStatus] = await db
        .insert(dailyScheduleStatuses)
        .values({
          scheduleId: scheduleId,
          date: formattedDate,
          isActive: true,
          currentReservations: 0,
        })
        .returning({ id: dailyScheduleStatuses.id });

      dailyStatusId = newStatus.id;
    }

    // Hitung nomor antrian
    const queueNumber = currentReservations + 1;

    // Buat reservasi baru
    const [newReservation] = await db
      .insert(reservations)
      .values({
        patientId,
        doctorId,
        scheduleId,
        reservationDate: scheduleDateObj,
        queueNumber,
        status: "Pending",
        examinationStatus: null,
        complaint:
          typeof complaint === "string" && complaint.trim()
            ? complaint.trim()
            : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: reservations.id });

    // Update jumlah reservasi saat ini pada status jadwal harian
    await db
      .update(dailyScheduleStatuses)
      .set({
        currentReservations: queueNumber,
      })
      .where(eq(dailyScheduleStatuses.id, dailyStatusId));

    return NextResponse.json({
      message: "Janji temu berhasil dibuat",
      id: newReservation.id,
      queueNumber,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
