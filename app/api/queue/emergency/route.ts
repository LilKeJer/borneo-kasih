// app/api/queue/emergency/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, patientDetails } from "@/db/schema";
import { eq, and, isNull, gte, desc } from "drizzle-orm";

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

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Dapatkan semua kasus darurat untuk hari ini
    const emergencyCases = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        patientName: patientDetails.name,
        queueNumber: reservations.queueNumber,
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
          gte(reservations.reservationDate, today),
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
