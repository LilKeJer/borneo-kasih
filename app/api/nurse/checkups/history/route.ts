// app/api/nurse/checkups/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicalHistories, patientDetails, doctorDetails } from "@/db/schema";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Nurse") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { message: "Format tanggal tidak valid" },
          { status: 400 }
        );
      }
      startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    const nurseId = Number(session.user.id);

    const conditions = [
      eq(medicalHistories.nurseId, nurseId),
      isNull(medicalHistories.deletedAt),
    ];

    if (startDate && endDate) {
      conditions.push(
        gte(medicalHistories.nurseCheckupTimestamp, startDate),
        lte(medicalHistories.nurseCheckupTimestamp, endDate)
      );
    }

    const records = await db
      .select({
        id: medicalHistories.id,
        reservationId: medicalHistories.reservationId,
        patientId: medicalHistories.patientId,
        patientName: patientDetails.name,
        doctorName: doctorDetails.name,
        nurseNotes: medicalHistories.encryptedNurseNotes,
        nurseCheckupTimestamp: medicalHistories.nurseCheckupTimestamp,
      })
      .from(medicalHistories)
      .leftJoin(
        patientDetails,
        eq(medicalHistories.patientId, patientDetails.userId)
      )
      .leftJoin(
        doctorDetails,
        eq(medicalHistories.doctorId, doctorDetails.userId)
      )
      .where(and(...conditions))
      .orderBy(desc(medicalHistories.nurseCheckupTimestamp));

    return NextResponse.json({
      data: records.map((record) => ({
        ...record,
        patientName: record.patientName || "Unknown Patient",
        doctorName: record.doctorName || "Unknown Doctor",
      })),
    });
  } catch (error) {
    console.error("Error fetching nurse checkup history:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
