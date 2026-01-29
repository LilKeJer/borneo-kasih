// app/api/patient/medical-history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicalHistories, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET - Get single medical record detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const recordId = parseInt(resolvedParams.id);
    const patientId = parseInt(session.user.id);

    // Query medical history detail
    const record = await db
      .select({
        id: medicalHistories.id,
        dateOfDiagnosis: medicalHistories.dateOfDiagnosis,
        condition: medicalHistories.encryptedCondition,
        description: medicalHistories.encryptedDescription,
        treatment: medicalHistories.encryptedTreatment,
        encryptionIvDoctor: medicalHistories.encryptionIvDoctor,
        createdAt: medicalHistories.createdAt,
        doctorName: users.username,
      })
      .from(medicalHistories)
      .leftJoin(users, eq(medicalHistories.doctorId, users.id))
      .where(
        and(
          eq(medicalHistories.id, recordId),
          eq(medicalHistories.patientId, patientId)
        )
      )
      .limit(1);

    if (!record[0]) {
      return NextResponse.json(
        { message: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: record[0].id,
      date: record[0].dateOfDiagnosis || record[0].createdAt,
      doctor: `Dr. ${record[0].doctorName}`,
      diagnosis: record[0].condition || "Pemeriksaan Umum",
      description: record[0].description || "Tidak ada deskripsi",
      treatment: record[0].treatment || "Tidak ada penanganan",
      encryptionIvDoctor: record[0].encryptionIvDoctor || null,
    });
  } catch (error) {
    console.error("Error fetching medical record detail:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
