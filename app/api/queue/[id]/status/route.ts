// app/api/queue/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, payments } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Receptionist", "Admin", "Nurse", "Doctor"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const reservationId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { examinationStatus } = body;

    if (!examinationStatus) {
      return NextResponse.json(
        { message: "Status pemeriksaan diperlukan" },
        { status: 400 }
      );
    }

    // Validasi status yang diberikan
    const validStatuses = ["Waiting", "In Progress", "Completed", "Cancelled"];
    if (!validStatuses.includes(examinationStatus)) {
      return NextResponse.json(
        { message: "Status tidak valid" },
        { status: 400 }
      );
    }

    // Gunakan transaction untuk konsistensi data
    const result = await db.transaction(async (tx) => {
      // Ambil data reservasi saat ini
      const [currentReservation] = await tx
        .select({
          id: reservations.id,
          status: reservations.status,
          examinationStatus: reservations.examinationStatus,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.id, reservationId),
            isNull(reservations.deletedAt)
          )
        )
        .limit(1);

      if (!currentReservation) {
        throw new Error("Reservasi tidak ditemukan");
      }

      // Tentukan status reservasi berdasarkan examinationStatus
      let reservationStatus = currentReservation.status;
      let finalExaminationStatus = examinationStatus;

      if (examinationStatus === "Completed") {
        // Jika examination completed, check apakah sudah ada payment
        const existingPayment = await tx
          .select({ id: payments.id })
          .from(payments)
          .where(
            and(
              eq(payments.reservationId, reservationId),
              isNull(payments.deletedAt)
            )
          )
          .limit(1);

        if (existingPayment.length > 0) {
          // Jika sudah ada payment, set status ke Completed
          reservationStatus = "Completed";
        } else {
          // Jika belum ada payment, set status ke Waiting for Payment
          finalExaminationStatus = "Waiting for Payment";
          reservationStatus = "Confirmed"; // Tetap confirmed sampai payment selesai
        }
      } else if (examinationStatus === "Cancelled") {
        reservationStatus = "Cancelled";
      } else {
        // Untuk "Waiting" dan "In Progress"
        reservationStatus = "Confirmed";
      }

      // Update kedua status
      await tx
        .update(reservations)
        .set({
          examinationStatus: finalExaminationStatus,
          status: reservationStatus,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservationId));

      return {
        examinationStatus: finalExaminationStatus,
        status: reservationStatus,
      };
    });

    return NextResponse.json({
      message: "Status antrian berhasil diperbarui",
      examinationStatus: result.examinationStatus,
      status: result.status,
    });
  } catch (error) {
    console.error("Error updating queue status:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Mendapatkan status queue
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const reservationId = parseInt(resolvedParams.id);

    const reservation = await db
      .select({
        id: reservations.id,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
        queueNumber: reservations.queueNumber,
      })
      .from(reservations)
      .where(
        and(eq(reservations.id, reservationId), isNull(reservations.deletedAt))
      )
      .limit(1);

    if (reservation.length === 0) {
      return NextResponse.json(
        { message: "Reservasi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if payment exists
    const paymentExists = await db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.reservationId, reservationId),
          isNull(payments.deletedAt)
        )
      )
      .limit(1);

    return NextResponse.json({
      ...reservation[0],
      hasPayment: paymentExists.length > 0,
    });
  } catch (error) {
    console.error("Error fetching queue status:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
