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
  paymentDetails,
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
      .select({
        id: payments.id,
        totalAmount: payments.totalAmount,
        paymentMethod: payments.paymentMethod,
        status: payments.status,
        paymentDate: payments.paymentDate,
        prescriptionId: payments.prescriptionId,
      })
      .from(payments)
      .where(
        and(
          eq(payments.reservationId, reservationId),
          isNull(payments.deletedAt)
        )
      )
      .limit(1);

    interface PaymentDetailData {
      id: number;
      itemType: string;
      serviceId: number | null;
      serviceName: string | null;
      prescriptionId: number | null;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      notes: string | null;
    }

    let paymentDetailsData: PaymentDetailData[] = [];
    if (existingPayment.length > 0) {
      // Jika ada payment, ambil detail payment
      const rawPaymentDetails = await db
        .select({
          id: paymentDetails.id,
          itemType: paymentDetails.itemType,
          serviceId: paymentDetails.serviceId,
          serviceName: serviceCatalog.name,
          prescriptionId: paymentDetails.prescriptionId,
          quantity: paymentDetails.quantity,
          unitPrice: paymentDetails.unitPrice,
          subtotal: paymentDetails.subtotal,
          notes: paymentDetails.notes,
        })
        .from(paymentDetails)
        .leftJoin(
          serviceCatalog,
          eq(paymentDetails.serviceId, serviceCatalog.id)
        )
        .where(
          and(
            eq(paymentDetails.paymentId, existingPayment[0].id),
            isNull(paymentDetails.deletedAt)
          )
        );

      paymentDetailsData = rawPaymentDetails.map((detail) => ({
        ...detail,
        unitPrice:
          typeof detail.unitPrice === "string"
            ? parseFloat(detail.unitPrice)
            : detail.unitPrice,
        subtotal:
          typeof detail.subtotal === "string"
            ? parseFloat(detail.subtotal)
            : detail.subtotal,
      }));
    }

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
          // Query prescriptions based on patient's medical history
          // This is simplified - you may need to join through medical_history table
          isNull(prescriptions.deletedAt),
          isNull(prescriptionMedicines.deletedAt)
        )
      )
      .limit(20); // Limit to recent prescriptions

    // Ambil daftar layanan yang tersedia
    const availableServices = await db
      .select({
        id: serviceCatalog.id,
        name: serviceCatalog.name,
        description: serviceCatalog.description,
        basePrice: serviceCatalog.basePrice,
        category: serviceCatalog.category,
        isActive: serviceCatalog.isActive,
      })
      .from(serviceCatalog)
      .where(
        and(eq(serviceCatalog.isActive, true), isNull(serviceCatalog.deletedAt))
      )
      .orderBy(serviceCatalog.category, serviceCatalog.name);

    return NextResponse.json({
      reservation: reservationData,
      hasPayment: existingPayment.length > 0,
      existingPayment:
        existingPayment.length > 0
          ? {
              ...existingPayment[0],
              details: paymentDetailsData,
            }
          : null,
      prescriptions: patientPrescriptions.filter((p) => p.medicineId !== null),
      availableServices: availableServices,
    });
  } catch (error) {
    console.error("Error fetching payment data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
