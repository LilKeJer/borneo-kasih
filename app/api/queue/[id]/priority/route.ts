// app/api/queue/[id]/priority/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Receptionist", "Admin", "Nurse"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const reservationId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { isPriority, priorityReason } = body;

    if (isPriority === undefined) {
      return NextResponse.json(
        { message: "Status prioritas diperlukan" },
        { status: 400 }
      );
    }

    // Dapatkan reservasi yang akan diubah statusnya
    const targetReservation = await db.query.reservations.findFirst({
      where: eq(reservations.id, reservationId),
    });

    if (!targetReservation) {
      return NextResponse.json(
        { message: "Reservasi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jika mengubah dari non-prioritas ke prioritas, kita perlu melakukan reordering
    if (isPriority && !targetReservation.isPriority) {
      // 1. Ambil tanggal dari reservasi target
      const reservationDate = targetReservation.reservationDate;
      const targetDate = new Date(reservationDate);
      targetDate.setHours(0, 0, 0, 0); // Reset ke awal hari

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // 2. Dapatkan semua reservasi pada hari yang sama dengan dokter yang sama yang masih menunggu
      const waitingReservations = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.doctorId, targetReservation.doctorId),
            eq(reservations.status, "Confirmed"),
            eq(reservations.examinationStatus, "Waiting"),
            gte(reservations.reservationDate, targetDate),
            lte(reservations.reservationDate, nextDay),
            isNull(reservations.deletedAt)
          )
        )
        .orderBy(reservations.queueNumber);

      // 3. Reordering antrian
      // Temukan posisi maksimum saat ini
      let maxQueueNumber = 0;
      for (const res of waitingReservations) {
        if (res.queueNumber && res.queueNumber > maxQueueNumber) {
          maxQueueNumber = res.queueNumber;
        }
      }

      // Set nomor antrian kasus darurat ke 1 (paling awal)
      await db
        .update(reservations)
        .set({
          queueNumber: 1,
          isPriority: true,
          priorityReason: priorityReason || "Kasus darurat",
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservationId));

      // Geser semua antrian lain +1
      for (const res of waitingReservations) {
        if (res.id !== reservationId && res.queueNumber) {
          await db
            .update(reservations)
            .set({
              queueNumber: res.queueNumber + 1,
              updatedAt: new Date(),
            })
            .where(eq(reservations.id, res.id));
        }
      }

      return NextResponse.json({
        message: "Status prioritas diubah dan antrian diatur ulang",
        isPriority: true,
        newQueueNumber: 1,
      });
    }
    // Jika mengubah dari prioritas ke non-prioritas atau hanya update alasan prioritas
    else {
      await db
        .update(reservations)
        .set({
          isPriority: isPriority,
          priorityReason: priorityReason || null,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservationId));

      return NextResponse.json({
        message: "Status prioritas berhasil diperbarui",
        isPriority: isPriority,
      });
    }
  } catch (error) {
    console.error("Error updating priority status:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
