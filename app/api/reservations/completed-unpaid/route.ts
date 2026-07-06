// app/api/reservations/completed-unpaid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  reservations,
  patientDetails,
  doctorDetails,
  payments,
} from "@/db/schema";
import { eq, and, isNull, desc, notExists, ilike, or, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ambil parameter query
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const conditions = [
      eq(reservations.examinationStatus, "Waiting for Payment"),
      eq(reservations.status, "Confirmed"),
      isNull(reservations.deletedAt),
      // Subquery untuk memastikan tidak ada pembayaran
      notExists(
        db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.reservationId, reservations.id),
              isNull(payments.deletedAt)
            )
          )
      ),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(patientDetails.name, `%${search}%`),
          ilike(doctorDetails.name, `%${search}%`),
          sql`${reservations.queueNumber}::text ILIKE ${`%${search}%`}`
        )!
      );
    }

    // Query reservasi yang menunggu pembayaran
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
      .where(and(...conditions))
      .orderBy(desc(reservations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Hitung total untuk paginasi
    const totalQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .where(and(...conditions));

    return NextResponse.json({
      data: completedReservations.map((reservation) => ({
        ...reservation,
        hasPayment: false, // Sudah dipastikan belum ada pembayaran
      })),
      pagination: {
        page,
        limit,
        total: totalQuery[0]?.count || 0,
        totalPages: Math.ceil((totalQuery[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching completed unpaid reservations:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
