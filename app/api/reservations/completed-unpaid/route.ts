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
import { eq, and, isNull, desc, notExists } from "drizzle-orm";

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

    // Query reservasi yang sudah selesai tapi belum ada pembayaran
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
          eq(reservations.examinationStatus, "Completed"),
          eq(reservations.status, "Completed"),
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
          )
        )
      )
      .orderBy(desc(reservations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Filter berdasarkan pencarian jika ada
    const filteredReservations = search
      ? completedReservations.filter(
          (reservation) =>
            reservation.patientName
              ?.toLowerCase()
              .includes(search.toLowerCase()) ||
            reservation.doctorName
              ?.toLowerCase()
              .includes(search.toLowerCase()) ||
            reservation.queueNumber?.toString().includes(search)
        )
      : completedReservations;

    // Hitung total untuk paginasi
    const totalQuery = await db
      .select({ count: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.examinationStatus, "Completed"),
          eq(reservations.status, "Completed"),
          isNull(reservations.deletedAt),
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
          )
        )
      );

    return NextResponse.json({
      data: filteredReservations.map((reservation) => ({
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
