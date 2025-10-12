// app/api/payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  payments,
  paymentDetails,
  reservations,
  patientDetails,
  doctorDetails,
} from "@/db/schema";
import { eq, and, isNull, desc, gte, lte } from "drizzle-orm";
import { type CreatePaymentRequest, type PaymentMethod } from "@/types/payment";

// POST - Buat pembayaran baru
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const receptionistId = parseInt(session.user.id);
    const body: CreatePaymentRequest = await req.json();

    const { reservationId, paymentMethod, items, prescriptionId } = body;

    // Validasi input
    if (!reservationId || !paymentMethod || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Data pembayaran tidak lengkap" },
        { status: 400 }
      );
    }

    // Validasi payment method
    const validPaymentMethods: PaymentMethod[] = [
      "Cash",
      "Debit",
      "Credit",
      "Transfer",
      "BPJS",
    ];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { message: "Metode pembayaran tidak valid" },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Verifikasi reservasi exists dan belum dibayar
      const reservation = await tx
        .select({
          id: reservations.id,
          patientId: reservations.patientId,
          status: reservations.status,
          examinationStatus: reservations.examinationStatus,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.id, reservationId),
            isNull(reservations.deletedAt)
          )
        )
        .limit(1);

      if (reservation.length === 0) {
        throw new Error("Reservasi tidak ditemukan");
      }

      const reservationData = reservation[0];

      // Cek apakah sudah ada pembayaran
      const existingPayment = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.reservationId, reservationId),
            isNull(payments.deletedAt)
          )
        )
        .limit(1);

      if (existingPayment.length > 0) {
        throw new Error("Reservasi ini sudah memiliki pembayaran");
      }

      // Validasi dan hitung total amount
      let totalAmount = 0;
      for (const item of items) {
        if (item.quantity <= 0 || item.unitPrice < 0) {
          throw new Error("Quantity dan harga harus valid");
        }

        // Validasi subtotal
        const calculatedSubtotal = item.quantity * item.unitPrice;
        if (Math.abs(calculatedSubtotal - item.subtotal) > 0.01) {
          throw new Error("Subtotal tidak sesuai dengan perhitungan");
        }

        totalAmount += item.subtotal;
      }

      if (totalAmount <= 0) {
        throw new Error("Total pembayaran harus lebih dari 0");
      }

      // Buat payment record
      const [newPayment] = await tx
        .insert(payments)
        .values({
          patientId: reservationData.patientId,
          reservationId: reservationId,
          receptionistId: receptionistId,
          totalAmount: totalAmount.toFixed(2),
          paymentMethod: paymentMethod,
          status: "Paid",
          prescriptionId: prescriptionId || null,
          paymentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: payments.id });

      // Buat payment detail records
      const paymentDetailsData = items.map((item) => ({
        paymentId: newPayment.id,
        itemType: item.itemType,
        serviceId: item.serviceId || null,
        prescriptionId: item.prescriptionId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        subtotal: item.subtotal.toFixed(2),
        notes: item.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await tx.insert(paymentDetails).values(paymentDetailsData);

      // Update status reservasi
      // Jika examination sudah completed, update reservation juga ke completed
      // Jika tidak, set status ke "Waiting for Payment"
      const updateData: { updatedAt: Date; status?: string } = {
        updatedAt: new Date(),
      };

      if (reservationData.examinationStatus === "Completed") {
        updateData.status = "Completed";
      } else {
        // Set flag bahwa payment sudah dibuat tapi examination belum selesai
        updateData.status = "Confirmed";
      }

      await tx
        .update(reservations)
        .set(updateData)
        .where(eq(reservations.id, reservationId));

      return {
        paymentId: newPayment.id,
        totalAmount: totalAmount,
      };
    });

    return NextResponse.json(
      {
        message: "Pembayaran berhasil diproses",
        paymentId: result.paymentId,
        totalAmount: result.totalAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Mendapatkan daftar pembayaran dengan filter dan pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as
      | "Paid"
      | "Pending"
      | "Cancelled"
      | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [isNull(payments.deletedAt)];

    if (status) {
      conditions.push(eq(payments.status, status));
    }

    if (startDate) {
      conditions.push(gte(payments.paymentDate, new Date(startDate)));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(payments.paymentDate, end));
    }

    // Query pembayaran dengan informasi terkait
    const paymentsQuery = await db
      .select({
        id: payments.id,
        totalAmount: payments.totalAmount,
        paymentMethod: payments.paymentMethod,
        status: payments.status,
        paymentDate: payments.paymentDate,
        reservationId: payments.reservationId,
        patientId: payments.patientId,
        patientName: patientDetails.name,
        doctorId: reservations.doctorId,
        doctorName: doctorDetails.name,
      })
      .from(payments)
      .leftJoin(patientDetails, eq(payments.patientId, patientDetails.userId))
      .leftJoin(reservations, eq(payments.reservationId, reservations.id))
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate))
      .limit(limit)
      .offset(offset);

    // Filter by patient name if search is provided
    let filteredPayments = paymentsQuery;
    if (search) {
      filteredPayments = paymentsQuery.filter((payment) =>
        payment.patientName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Count total records for pagination
    const [countResult] = await db
      .select({ count: payments.id })
      .from(payments)
      .where(and(...conditions));

    const totalRecords = countResult?.count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      data: filteredPayments,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
