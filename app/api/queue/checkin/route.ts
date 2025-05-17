// app/api/queue/checkin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reservationId } = body;

    if (!reservationId) {
      return NextResponse.json(
        { message: "ID reservasi diperlukan" },
        { status: 400 }
      );
    }

    // Dapatkan reservasi
    const reservation = await db.query.reservations.findFirst({
      where: eq(reservations.id, reservationId),
    });

    if (!reservation) {
      return NextResponse.json(
        { message: "Reservasi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verifikasi status reservasi
    if (
      reservation.status !== "Confirmed" &&
      reservation.status !== "Pending"
    ) {
      return NextResponse.json(
        {
          message:
            "Hanya reservasi dengan status Confirmed atau Pending yang dapat di-checkin",
        },
        { status: 400 }
      );
    }

    // Update status reservasi dan status pemeriksaan
    await db
      .update(reservations)
      .set({
        status: "Confirmed",
        examinationStatus: "Waiting",
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, reservationId));

    return NextResponse.json({
      message: "Check-in pasien berhasil",
      reservationId,
    });
  } catch (error) {
    console.error("Error checking in patient:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
