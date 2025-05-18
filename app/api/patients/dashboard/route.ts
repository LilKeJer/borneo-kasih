// app/api/patients/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { eq, desc, gte, and, not, isNull } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);
    const now = new Date();

    // Get next appointment (yang belum selesai dan tidak dibatalkan)
    const nextAppointment = await db
      .select({
        id: reservations.id,
        doctorId: reservations.doctorId,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.patientId, patientId),
          gte(reservations.reservationDate, now),
          not(eq(reservations.status, "Cancelled")), // Tambahkan filter ini untuk menghindari appointment yang dibatalkan
          not(eq(reservations.status, "Completed")), // Tambahkan filter ini untuk menghindari appointment yang sudah selesai
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(reservations.reservationDate)
      .limit(1);

    // Get last visit
    const lastVisit = await db
      .select({
        id: reservations.id,
        reservationDate: reservations.reservationDate,
        status: reservations.status,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.patientId, patientId),
          eq(reservations.status, "Completed")
        )
      )
      .orderBy(desc(reservations.reservationDate))
      .limit(1);

    // Format response
    const dashboardData = {
      nextAppointment: nextAppointment[0]
        ? {
            id: nextAppointment[0].id,
            date: nextAppointment[0].reservationDate,
            queueNumber: nextAppointment[0].queueNumber,
            status: nextAppointment[0].status,
            examinationStatus:
              nextAppointment[0].examinationStatus || "Not Started",
          }
        : null,
      lastVisit: lastVisit[0]
        ? {
            id: lastVisit[0].id,
            date: lastVisit[0].reservationDate,
          }
        : null,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
