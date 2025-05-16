// app/api/patients/prescriptions/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  prescriptions,
  prescriptionMedicines,
  medicines,
  medicalHistories,
  users,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

interface MedicineData {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
}

interface PrescriptionGroup {
  date: string;
  doctorName: string;
  diagnosis: string;
  medicines: MedicineData[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);

    // Get prescriptions with medical record context
    const patientPrescriptions = await db
      .select({
        // Medical record data
        visitDate: medicalHistories.createdAt,
        diagnosis: medicalHistories.encryptedCondition,
        doctorName: users.username,

        // Prescription data
        prescriptionId: prescriptions.id,

        // Medicine data
        medicineName: medicines.name,
        dosage: prescriptionMedicines.encryptedDosage,
        frequency: prescriptionMedicines.encryptedFrequency,
        duration: prescriptionMedicines.encryptedDuration,
        quantity: prescriptionMedicines.quantityUsed,
      })
      .from(medicalHistories)
      .leftJoin(
        prescriptions,
        eq(prescriptions.medicalHistoryId, medicalHistories.id)
      )
      .leftJoin(
        prescriptionMedicines,
        eq(prescriptions.id, prescriptionMedicines.prescriptionId)
      )
      .leftJoin(medicines, eq(prescriptionMedicines.medicineId, medicines.id))
      .leftJoin(users, eq(medicalHistories.doctorId, users.id))
      .where(eq(medicalHistories.patientId, patientId))
      .orderBy(desc(medicalHistories.createdAt))
      .limit(20);

    // Group by prescription
    const groupedData = patientPrescriptions.reduce((acc, row) => {
      if (!row.prescriptionId) return acc;

      const key = row.prescriptionId.toString();

      if (!acc[key]) {
        acc[key] = {
          date: row.visitDate?.toISOString().split("T")[0] || "No date",
          doctorName: `Dr. ${row.doctorName}` || "Unknown Doctor",
          diagnosis: row.diagnosis || "General Checkup",
          medicines: [],
        };
      }

      if (row.medicineName) {
        acc[key].medicines.push({
          name: row.medicineName,
          dosage: row.dosage || "See doctor",
          frequency: row.frequency || "See doctor",
          duration: row.duration || "See doctor",
          quantity: row.quantity || 0,
        });
      }

      return acc;
    }, {} as Record<string, PrescriptionGroup>);

    // Convert to array
    const prescriptionsList = Object.values(groupedData);

    return NextResponse.json({
      prescriptions: prescriptionsList,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Error loading prescriptions" },
      { status: 500 }
    );
  }
}
