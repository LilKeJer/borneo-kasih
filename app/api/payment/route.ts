// app/api/payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { payments, paymentDetails, reservations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { type CreatePaymentRequest, type PaymentMethod } from "@/types/payment";

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

    // Verifikasi reservasi exists dan belum dibayar
    const reservation = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
      })
      .from(reservations)
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

    // Cek apakah sudah ada pembayaran
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

    if (existingPayment.length > 0) {
      return NextResponse.json(
        { message: "Reservasi ini sudah memiliki pembayaran" },
        { status: 409 }
      );
    }

    // Hitung total amount
    let totalAmount = 0;
    for (const item of items) {
      if (item.quantity <= 0 || item.unitPrice < 0) {
        return NextResponse.json(
          { message: "Quantity dan harga harus valid" },
          { status: 400 }
        );
      }
      totalAmount += item.subtotal;
    }

    if (totalAmount <= 0) {
      return NextResponse.json(
        { message: "Total pembayaran harus lebih dari 0" },
        { status: 400 }
      );
    }

    // Buat payment record
    const [newPayment] = await db
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
    const paymentDetailPromises = items.map(async (item) => {
      return db.insert(paymentDetails).values({
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
      });
    });

    await Promise.all(paymentDetailPromises);

    // Update status reservasi menjadi Completed jika belum
    if (reservationData.examinationStatus !== "Completed") {
      await db
        .update(reservations)
        .set({
          examinationStatus: "Completed",
          status: "Completed",
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservationId));
    }

    return NextResponse.json(
      {
        message: "Pembayaran berhasil diproses",
        paymentId: newPayment.id,
        totalAmount: totalAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Mendapatkan daftar pembayaran
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Query pembayaran dengan informasi terkait
    const paymentsQuery = db
      .select({
        id: payments.id,
        totalAmount: payments.totalAmount,
        paymentMethod: payments.paymentMethod,
        status: payments.status,
        paymentDate: payments.paymentDate,
        reservationId: payments.reservationId,
        // Akan disesuaikan dengan join
      })
      .from(payments)
      .where(isNull(payments.deletedAt))
      .orderBy(payments.paymentDate)
      .limit(limit)
      .offset(offset);

    const paymentsData = await paymentsQuery;

    return NextResponse.json({
      data: paymentsData,
      pagination: {
        page,
        limit,
        // total akan dihitung terpisah jika diperlukan
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
