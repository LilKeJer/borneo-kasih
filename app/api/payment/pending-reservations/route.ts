// app/api/payment/pending-reservations/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  reservations,
  patientDetails,
  doctorDetails,
  payments,
} from "@/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Query reservasi yang:
    // 1. Status examination = "Completed" atau "Waiting for Payment"
    // 2. Belum memiliki payment
    const completedReservations = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        patientName: patientDetails.name,
        doctorId: reservations.doctorId,
        doctorName: doctorDetails.name,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
        createdAt: reservations.createdAt,
      })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .where(
        and(
          or(
            eq(reservations.examinationStatus, "Completed"),
            eq(reservations.examinationStatus, "Waiting for Payment")
          ),
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(reservations.reservationDate);

    // Filter out reservations yang sudah memiliki payment
    const reservationIds = completedReservations.map((r) => r.id);

    if (reservationIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get existing payments for these reservations
    const existingPayments = await db
      .select({
        reservationId: payments.reservationId,
      })
      .from(payments)
      .where(
        and(
          isNull(payments.deletedAt)
          // Check if reservation id is in the list
        )
      );

    const paidReservationIds = new Set(
      existingPayments.map((p) => p.reservationId)
    );

    // Filter out paid reservations
    const pendingReservations = completedReservations.filter(
      (r) => !paidReservationIds.has(r.id)
    );

    return NextResponse.json({
      data: pendingReservations.map((r) => ({
        ...r,
        hasPayment: false,
      })),
    });
  } catch (error) {
    console.error("Error fetching pending reservations:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
