// app/api/patient/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);
    const now = new Date();

    // Get next appointment
    const nextAppointment = await db
      .select({
        id: reservations.id,
        doctorId: reservations.doctorId,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.patientId, patientId),
          gte(reservations.reservationDate, now),
          sql`${reservations.status} IN ('Pending', 'Confirmed')`
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
            date: nextAppointment[0].reservationDate,
            queueNumber: nextAppointment[0].queueNumber,
            status: nextAppointment[0].status,
          }
        : null,
      lastVisit: lastVisit[0]
        ? {
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
