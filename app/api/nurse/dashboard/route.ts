// app/api/nurse/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicalHistories, reservations } from "@/db/schema";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Nurse") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const nurseId = Number(session.user.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const patientsTodayResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(
        and(
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          inArray(reservations.status, ["Pending", "Confirmed", "Completed"])
        )
      );

    const waitingForCheckupResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .leftJoin(
        medicalHistories,
        and(
          eq(medicalHistories.reservationId, reservations.id),
          isNull(medicalHistories.deletedAt)
        )
      )
      .where(
        and(
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          inArray(reservations.status, ["Pending", "Confirmed", "Completed"]),
          inArray(reservations.examinationStatus, ["Waiting", "Not Started"]),
          isNull(medicalHistories.nurseCheckupTimestamp)
        )
      );

    const checkupsTodayResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(medicalHistories)
      .where(
        and(
          eq(medicalHistories.nurseId, nurseId),
          gte(medicalHistories.nurseCheckupTimestamp, today),
          sql`${medicalHistories.nurseCheckupTimestamp} < ${tomorrow}`,
          isNull(medicalHistories.deletedAt)
        )
      );

    return NextResponse.json({
      patientsToday: Number(patientsTodayResult[0]?.count || 0),
      waitingForCheckup: Number(waitingForCheckupResult[0]?.count || 0),
      checkupsToday: Number(checkupsTodayResult[0]?.count || 0),
    });
  } catch (error) {
    console.error("Error fetching nurse dashboard:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
