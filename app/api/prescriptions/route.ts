// app/api/prescriptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  prescriptions,
  medicalHistories,
  prescriptionMedicines,
  medicines,
  patientDetails,
  doctorDetails,
} from "@/db/schema";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Pharmacist") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const limitParam = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isNaN(limitParam) ? 50 : Math.max(limitParam, 1);

    const conditions = [
      isNull(prescriptions.deletedAt),
      isNull(medicalHistories.deletedAt),
    ];

    if (search) {
      const searchConditions = [
        ilike(patientDetails.name, `%${search}%`),
        ilike(doctorDetails.name, `%${search}%`),
      ];

      if (/^\d+$/.test(search)) {
        searchConditions.push(eq(prescriptions.id, Number.parseInt(search, 10)));
      }

      conditions.push(or(...searchConditions)!);
    }

    const rows = await db
      .select({
        prescriptionId: prescriptions.id,
        medicalHistoryId: prescriptions.medicalHistoryId,
        createdAt: prescriptions.createdAt,
        paymentStatus: prescriptions.paymentStatus,
        dispenseStatus: prescriptions.dispenseStatus,
        patientName: patientDetails.name,
        doctorName: doctorDetails.name,
        prescriptionMedicineId: prescriptionMedicines.id,
        medicineId: prescriptionMedicines.medicineId,
        medicineName: medicines.name,
        encryptedDosage: prescriptionMedicines.encryptedDosage,
        encryptedFrequency: prescriptionMedicines.encryptedFrequency,
        encryptedDuration: prescriptionMedicines.encryptedDuration,
        encryptionIv: prescriptionMedicines.encryptionIv,
        quantityUsed: prescriptionMedicines.quantityUsed,
        stockId: prescriptionMedicines.stockId,
      })
      .from(prescriptions)
      .innerJoin(
        medicalHistories,
        eq(prescriptions.medicalHistoryId, medicalHistories.id)
      )
      .leftJoin(
        patientDetails,
        eq(medicalHistories.patientId, patientDetails.userId)
      )
      .leftJoin(
        doctorDetails,
        eq(medicalHistories.doctorId, doctorDetails.userId)
      )
      .leftJoin(
        prescriptionMedicines,
        and(
          eq(prescriptions.id, prescriptionMedicines.prescriptionId),
          isNull(prescriptionMedicines.deletedAt)
        )
      )
      .leftJoin(
        medicines,
        and(
          eq(prescriptionMedicines.medicineId, medicines.id),
          isNull(medicines.deletedAt)
        )
      )
      .where(and(...conditions))
      .orderBy(desc(prescriptions.createdAt))
      .limit(limit);

    const grouped = new Map<
      number,
      {
        id: number;
        medicalHistoryId: number;
        patientName: string;
        doctorName: string;
        prescriptionDate: Date | null;
        status: "Pending" | "Processed";
        hasPayment: boolean;
        medicines: Array<{
          prescriptionMedicineId: number;
          medicineId: number;
          medicineName: string;
          encryptedDosage: string | null;
          encryptedFrequency: string | null;
          encryptedDuration: string | null;
          encryptionIv: string | null;
          quantityUsed: number;
          stockId: number;
          isDispensed: boolean;
        }>;
      }
    >();

    for (const row of rows) {
      const isDispensed = row.dispenseStatus === "Dispensed";

      if (!grouped.has(row.prescriptionId)) {
        grouped.set(row.prescriptionId, {
          id: row.prescriptionId,
          medicalHistoryId: row.medicalHistoryId,
          patientName: row.patientName || "Unknown Patient",
          doctorName: row.doctorName || "Unknown Doctor",
          prescriptionDate: row.createdAt,
          status: isDispensed ? "Processed" : "Pending",
          hasPayment: row.paymentStatus === "Paid",
          medicines: [],
        });
      }

      if (
        row.prescriptionMedicineId &&
        row.medicineId &&
        row.stockId !== null
      ) {
        grouped.get(row.prescriptionId)!.medicines.push({
          prescriptionMedicineId: row.prescriptionMedicineId,
          medicineId: row.medicineId,
          medicineName: row.medicineName || "Unknown Medicine",
          encryptedDosage: row.encryptedDosage,
          encryptedFrequency: row.encryptedFrequency,
          encryptedDuration: row.encryptedDuration,
          encryptionIv: row.encryptionIv,
          quantityUsed: row.quantityUsed ?? 0,
          stockId: row.stockId,
          isDispensed,
        });
      }
    }

    return NextResponse.json({ data: Array.from(grouped.values()) });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
