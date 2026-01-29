// app/api/nurse/checkups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicalHistories, reservations } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Nurse", "Doctor", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reservationIdParam = searchParams.get("reservationId");

    if (!reservationIdParam) {
      return NextResponse.json(
        { message: "reservationId diperlukan" },
        { status: 400 }
      );
    }

    const reservationId = Number(reservationIdParam);
    if (Number.isNaN(reservationId)) {
      return NextResponse.json(
        { message: "reservationId tidak valid" },
        { status: 400 }
      );
    }

    const existingRecord = await db.query.medicalHistories.findFirst({
      where: and(
        eq(medicalHistories.reservationId, reservationId),
        isNull(medicalHistories.deletedAt)
      ),
      orderBy: [desc(medicalHistories.updatedAt)],
    });

    if (!existingRecord) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      id: existingRecord.id,
      reservationId: existingRecord.reservationId,
      nurseNotes: existingRecord.encryptedNurseNotes || "",
      encryptionIvNurse: existingRecord.encryptionIvNurse || null,
      nurseCheckupTimestamp: existingRecord.nurseCheckupTimestamp,
    });
  } catch (error) {
    console.error("Error fetching nurse checkup:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Nurse") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reservationId, nurseNotes, encryptionIvNurse } = body;
    const reservationIdNumber = Number(reservationId);

    if (!reservationId || Number.isNaN(reservationIdNumber)) {
      return NextResponse.json(
        { message: "reservationId diperlukan" },
        { status: 400 }
      );
    }

    if (typeof nurseNotes !== "string" || !nurseNotes.trim()) {
      return NextResponse.json(
        { message: "Catatan perawat wajib diisi" },
        { status: 400 }
      );
    }

    const reservation = await db.query.reservations.findFirst({
      where: and(
        eq(reservations.id, reservationIdNumber),
        isNull(reservations.deletedAt)
      ),
    });

    if (!reservation) {
      return NextResponse.json(
        { message: "Reservasi tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      reservation.status === "Cancelled" ||
      reservation.status === "Completed" ||
      reservation.examinationStatus === "Completed" ||
      reservation.examinationStatus === "Cancelled" ||
      reservation.examinationStatus === "Waiting for Payment"
    ) {
      return NextResponse.json(
        { message: "Reservasi tidak dapat diproses" },
        { status: 400 }
      );
    }

    const nurseId = Number(session.user.id);
    const trimmedNotes = nurseNotes.trim();

    const existingRecord = await db.query.medicalHistories.findFirst({
      where: and(
        eq(medicalHistories.reservationId, reservationIdNumber),
        isNull(medicalHistories.deletedAt)
      ),
      orderBy: [desc(medicalHistories.updatedAt)],
    });

    if (existingRecord) {
      await db
        .update(medicalHistories)
        .set({
          nurseId,
          encryptedNurseNotes: trimmedNotes,
          encryptionIvNurse: encryptionIvNurse ?? null,
          nurseCheckupTimestamp: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(medicalHistories.id, existingRecord.id));

      return NextResponse.json({
        message: "Catatan perawat diperbarui",
        medicalRecordId: existingRecord.id,
      });
    }

    const [newRecord] = await db
      .insert(medicalHistories)
      .values({
        patientId: reservation.patientId,
        reservationId: reservationIdNumber,
        doctorId: reservation.doctorId,
        nurseId,
        encryptedNurseNotes: trimmedNotes,
        encryptionIvNurse: encryptionIvNurse ?? null,
        nurseCheckupTimestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: medicalHistories.id });

    return NextResponse.json({
      message: "Catatan perawat disimpan",
      medicalRecordId: newRecord.id,
    });
  } catch (error) {
    console.error("Error saving nurse checkup:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
