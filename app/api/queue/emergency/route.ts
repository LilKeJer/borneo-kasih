// app/api/queue/emergency/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, patientDetails } from "@/db/schema";
import { eq, and, isNull, gte, lt, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Doctor", "Nurse", "Receptionist"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ambil tanggal hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    // Dapatkan kasus darurat aktif untuk hari ini.
    // Status darurat hanya aktif selama pasien masih menunggu dokter.
    const emergencyCases = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        patientName: patientDetails.name,
        queueNumber: reservations.queueNumber,
        examinationStatus: reservations.examinationStatus,
        isPriority: reservations.isPriority,
        priorityReason: reservations.priorityReason,
        updatedAt: reservations.updatedAt,
      })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .where(
        and(
          eq(reservations.isPriority, true),
          eq(reservations.status, "Confirmed"),
          eq(reservations.examinationStatus, "Waiting"),
          gte(reservations.reservationDate, today),
          lt(reservations.reservationDate, nextDay),
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(desc(reservations.updatedAt));

    return NextResponse.json({
      emergencyPatients: emergencyCases,
    });
  } catch (error) {
    console.error("Error fetching emergency cases:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
