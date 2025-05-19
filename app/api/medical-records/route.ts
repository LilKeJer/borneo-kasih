// app/api/medical-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicalHistories, reservations } from "@/db/schema";
import { doctorNotesSchema } from "@/lib/validations/medical-record";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Doctor") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const doctorId = parseInt(session.user.id);
    const body = await req.json();

    // Validasi input menggunakan schema yang sama dengan form
    const validationResult = doctorNotesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { patientId, condition, description, treatment, doctorNotes } =
      validationResult.data;

    // Enkripsi data sensitif akan ditangani di level database
    const today = new Date();
    const todayISOString = today.toISOString(); // Konversi ke string format ISO

    // Insert data ke database
    const [newRecord] = await db
      .insert(medicalHistories)
      .values({
        patientId: parseInt(patientId),
        doctorId: doctorId,
        nurseId: doctorId, // Untuk MVP, dokter bisa input langsung tanpa perawat
        dateOfDiagnosis: todayISOString, // Gunakan string ISO daripada objek Date

        // Data terenkripsi untuk catatan dokter
        encryptedCondition: condition,
        encryptedDescription: description,
        encryptedTreatment: treatment,
        encryptedDoctorNotes: doctorNotes || null,
        encryptionIvDoctor: "placeholder", // Untuk MVP, gunakan placeholder (perlu diimplementasikan enkripsi)

        // Data placeholder untuk catatan perawat
        encryptedNurseNotes: "Ditambahkan langsung oleh dokter",
        encryptionIvNurse: "placeholder",

        createdAt: today,
        updatedAt: today,
        // Gunakan juga format string ISO untuk createdAt dan updatedAt jika diperlukan
        // Atau, biarkan defaultNow() handle ini jika kolom tersebut sudah memiliki default
      })
      .returning({ id: medicalHistories.id });

    // 2. Cari reservasi aktif untuk pasien ini dengan dokter ini
    const activeReservation = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.patientId, parseInt(patientId)),
          eq(reservations.doctorId, doctorId),
          eq(reservations.examinationStatus, "In Progress"),
          isNull(reservations.deletedAt)
        )
      )
      .limit(1);

    // 3. Jika ada reservasi aktif, update statusnya menjadi Completed
    if (activeReservation.length > 0) {
      await db
        .update(reservations)
        .set({
          status: "Completed",
          examinationStatus: "Completed",
          updatedAt: today,
        })
        .where(eq(reservations.id, activeReservation[0].id));
    }

    return NextResponse.json(
      {
        message: "Rekam medis berhasil dibuat dan status pasien diperbarui",
        id: newRecord.id,
        reservationUpdated: activeReservation.length > 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating medical record:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// app/api/medical-records/route.ts (bagian GET yang diperbaiki)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Doctor", "Nurse"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { message: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Query rekam medis untuk pasien tertentu menggunakan sintaks yang benar
    const records = await db
      .select({
        id: medicalHistories.id,
        patientId: medicalHistories.patientId,
        doctorId: medicalHistories.doctorId,
        dateOfDiagnosis: medicalHistories.dateOfDiagnosis,
        condition: medicalHistories.encryptedCondition,
        description: medicalHistories.encryptedDescription,
        treatment: medicalHistories.encryptedTreatment,
        doctorNotes: medicalHistories.encryptedDoctorNotes,
        createdAt: medicalHistories.createdAt,
      })
      .from(medicalHistories)
      .where(
        and(
          eq(medicalHistories.patientId, parseInt(patientId)),
          isNull(medicalHistories.deletedAt)
        )
      )
      .orderBy(desc(medicalHistories.createdAt));

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching medical records:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
