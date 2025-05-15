// app/api/patient/medical-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicalHistories, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// GET - Get patient medical history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const patientId = parseInt(session.user.id);

    // Query medical histories with doctor name
    const histories = await db
      .select({
        id: medicalHistories.id,
        dateOfDiagnosis: medicalHistories.dateOfDiagnosis,
        condition: medicalHistories.encryptedCondition,
        createdAt: medicalHistories.createdAt,
        doctorName: users.username,
      })
      .from(medicalHistories)
      .leftJoin(users, eq(medicalHistories.doctorId, users.id))
      .where(eq(medicalHistories.patientId, patientId))
      .orderBy(desc(medicalHistories.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total records
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(medicalHistories)
      .where(eq(medicalHistories.patientId, patientId));

    return NextResponse.json({
      data: histories.map((history) => ({
        id: history.id,
        date: history.dateOfDiagnosis || history.createdAt,
        doctor: `Dr. ${history.doctorName}`,
        diagnosis: history.condition || "Pemeriksaan Umum",
      })),
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching medical history:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
