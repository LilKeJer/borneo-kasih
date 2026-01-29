// app/api/medical-records/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicalHistories, doctorDetails, patientDetails } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

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
    const recordId = parseInt(resolvedParams.id);

    // Dapatkan detail rekam medis
    const record = await db
      .select({
        id: medicalHistories.id,
        patientId: medicalHistories.patientId,
        patientName: patientDetails.name,
        doctorId: medicalHistories.doctorId,
        doctorName: doctorDetails.name,
        condition: medicalHistories.encryptedCondition,
        description: medicalHistories.encryptedDescription,
        treatment: medicalHistories.encryptedTreatment,
        doctorNotes: medicalHistories.encryptedDoctorNotes,
        encryptionIvDoctor: medicalHistories.encryptionIvDoctor,
        dateOfDiagnosis: medicalHistories.dateOfDiagnosis,
        createdAt: medicalHistories.createdAt,
      })
      .from(medicalHistories)
      .leftJoin(
        doctorDetails,
        eq(medicalHistories.doctorId, doctorDetails.userId)
      )
      .leftJoin(
        patientDetails,
        eq(medicalHistories.patientId, patientDetails.userId)
      )
      .where(
        and(
          eq(medicalHistories.id, recordId),
          isNull(medicalHistories.deletedAt)
        )
      )
      .limit(1);

    if (record.length === 0) {
      return NextResponse.json(
        { message: "Rekam medis tidak ditemukan" },
        { status: 404 }
      );
    }

    // Periksa apakah pengguna memiliki akses
    if (
      session.user.role === "Patient" &&
      parseInt(session.user.id) !== record[0].patientId
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(record[0]);
  } catch (error) {
    console.error("Error fetching medical record:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil rekam medis" },
      { status: 500 }
    );
  }
}

// PUT - Perbarui rekam medis (opsional untuk pengembangan mendatang)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Doctor") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const recordId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { condition, description, treatment, doctorNotes, encryptionIvDoctor } =
      body;

    // Periksa apakah rekam medis ada
    const existingRecord = await db.query.medicalHistories.findFirst({
      where: and(
        eq(medicalHistories.id, recordId),
        isNull(medicalHistories.deletedAt)
      ),
    });

    if (!existingRecord) {
      return NextResponse.json(
        { message: "Rekam medis tidak ditemukan" },
        { status: 404 }
      );
    }

    // Perbarui rekam medis
    await db
      .update(medicalHistories)
      .set({
        encryptedCondition: condition || existingRecord.encryptedCondition,
        encryptedDescription:
          description || existingRecord.encryptedDescription,
        encryptedTreatment: treatment || existingRecord.encryptedTreatment,
        encryptedDoctorNotes:
          doctorNotes || existingRecord.encryptedDoctorNotes,
        encryptionIvDoctor:
          encryptionIvDoctor || existingRecord.encryptionIvDoctor,
        updatedAt: new Date(),
      })
      .where(eq(medicalHistories.id, recordId));

    return NextResponse.json({
      message: "Rekam medis berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating medical record:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memperbarui rekam medis" },
      { status: 500 }
    );
  }
}

// DELETE - Hapus rekam medis (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Doctor", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const recordId = parseInt(resolvedParams.id);

    // Periksa apakah rekam medis ada
    const existingRecord = await db.query.medicalHistories.findFirst({
      where: and(
        eq(medicalHistories.id, recordId),
        isNull(medicalHistories.deletedAt)
      ),
    });

    if (!existingRecord) {
      return NextResponse.json(
        { message: "Rekam medis tidak ditemukan" },
        { status: 404 }
      );
    }

    // Soft delete rekam medis
    await db
      .update(medicalHistories)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(medicalHistories.id, recordId));

    return NextResponse.json({
      message: "Rekam medis berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting medical record:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus rekam medis" },
      { status: 500 }
    );
  }
}
