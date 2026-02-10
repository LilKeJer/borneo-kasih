// app/api/receptionist/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { payments, reservations, users } from "@/db/schema";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Receptionist") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointmentsTodayResult = await db
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

    const waitingForDoctorResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(
        and(
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          inArray(reservations.examinationStatus, ["Waiting", "In Progress"])
        )
      );

    const waitingForPaymentResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(
        and(
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          eq(reservations.examinationStatus, "Waiting for Payment")
        )
      );

    const totalPatientsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(eq(users.role, "Patient"), isNull(users.deletedAt)));

    const newPatientsTodayResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        and(
          eq(users.role, "Patient"),
          gte(users.createdAt, today),
          sql`${users.createdAt} < ${tomorrow}`,
          isNull(users.deletedAt)
        )
      );

    const paymentsTodayResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${payments.totalAmount}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, "Paid"),
          gte(payments.paymentDate, today),
          sql`${payments.paymentDate} < ${tomorrow}`,
          isNull(payments.deletedAt)
        )
      );

    return NextResponse.json({
      appointmentsToday: Number(appointmentsTodayResult[0]?.count || 0),
      waitingForDoctor: Number(waitingForDoctorResult[0]?.count || 0),
      waitingForPayment: Number(waitingForPaymentResult[0]?.count || 0),
      totalPatients: Number(totalPatientsResult[0]?.count || 0),
      newPatientsToday: Number(newPatientsTodayResult[0]?.count || 0),
      paymentsToday: Number(paymentsTodayResult[0]?.count || 0),
      totalSalesToday: Number(paymentsTodayResult[0]?.total || 0),
    });
  } catch (error) {
    console.error("Error fetching receptionist dashboard:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
