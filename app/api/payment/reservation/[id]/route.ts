// app/api/payment/reservation/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  reservations,
  patientDetails,
  doctorDetails,
  payments,
  prescriptions,
  prescriptionMedicines,
  medicines,
  serviceCatalog,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const reservationId = parseInt(resolvedParams.id);

    if (isNaN(reservationId)) {
      return NextResponse.json(
        { message: "ID reservasi tidak valid" },
        { status: 400 }
      );
    }

    // Ambil detail reservasi dengan informasi pasien dan dokter
    const reservation = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        patientName: patientDetails.name,
        doctorId: reservations.doctorId,
        doctorName: doctorDetails.name,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
      })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .where(
        and(eq(reservations.id, reservationId), isNull(reservations.deletedAt))
      )
      .limit(1);

    if (reservation.length === 0) {
      return NextResponse.json(
        { message: "Reservasi tidak ditemukan" },
        { status: 404 }
      );
    }

    const reservationData = reservation[0];

    // Cek apakah sudah ada pembayaran untuk reservasi ini
    const existingPayment = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.reservationId, reservationId),
          isNull(payments.deletedAt)
        )
      )
      .limit(1);

    // Ambil resep yang terkait dengan pasien ini (dari medical history terbaru)
    const patientPrescriptions = await db
      .select({
        prescriptionId: prescriptions.id,
        medicineId: medicines.id,
        medicineName: medicines.name,
        medicinePrice: medicines.price,
        dosage: prescriptionMedicines.encryptedDosage,
        frequency: prescriptionMedicines.encryptedFrequency,
        duration: prescriptionMedicines.encryptedDuration,
        quantityUsed: prescriptionMedicines.quantityUsed,
      })
      .from(prescriptions)
      .leftJoin(
        prescriptionMedicines,
        eq(prescriptions.id, prescriptionMedicines.prescriptionId)
      )
      .leftJoin(medicines, eq(prescriptionMedicines.medicineId, medicines.id))
      .where(
        and(
          eq(prescriptions.medicalHistoryId, reservationData.patientId), // Ini perlu disesuaikan dengan medical history ID yang tepat
          isNull(prescriptions.deletedAt)
        )
      );

    // Ambil semua layanan yang tersedia
    const availableServices = await db
      .select()
      .from(serviceCatalog)
      .where(
        and(eq(serviceCatalog.isActive, true), isNull(serviceCatalog.deletedAt))
      )
      .orderBy(serviceCatalog.category, serviceCatalog.name);

    return NextResponse.json({
      reservation: reservationData,
      existingPayment: existingPayment[0] || null,
      prescriptions: patientPrescriptions,
      availableServices,
      hasPayment: existingPayment.length > 0,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
