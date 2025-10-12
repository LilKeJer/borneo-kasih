// app/api/payment-detail/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  paymentDetails,
  payments,
  serviceCatalog,
  prescriptions,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { type ItemType } from "@/types/payment";

// POST - Buat payment detail (bulk insert)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paymentId, items } = body;

    // Validasi input
    if (!paymentId || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Data detail pembayaran tidak lengkap" },
        { status: 400 }
      );
    }

    // Verifikasi payment exists
    const payment = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), isNull(payments.deletedAt)))
      .limit(1);

    if (payment.length === 0) {
      return NextResponse.json(
        { message: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      const insertedDetails = [];

      for (const item of items) {
        // Validasi item type
        const validItemTypes: ItemType[] = ["Service", "Prescription", "Other"];
        if (!validItemTypes.includes(item.itemType)) {
          throw new Error(`Tipe item tidak valid: ${item.itemType}`);
        }

        // Validasi quantity dan unit price
        if (item.quantity <= 0) {
          throw new Error("Quantity harus lebih dari 0");
        }

        if (item.unitPrice < 0) {
          throw new Error("Harga unit tidak boleh negatif");
        }

        // Calculate dan validate subtotal
        const calculatedSubtotal = item.quantity * item.unitPrice;
        if (Math.abs(calculatedSubtotal - item.subtotal) > 0.01) {
          throw new Error("Subtotal tidak sesuai dengan perhitungan");
        }

        // Validasi serviceId atau prescriptionId sesuai itemType
        if (item.itemType === "Service") {
          if (!item.serviceId) {
            throw new Error("Service ID diperlukan untuk tipe Service");
          }

          // Verifikasi service exists
          const service = await tx
            .select()
            .from(serviceCatalog)
            .where(
              and(
                eq(serviceCatalog.id, item.serviceId),
                isNull(serviceCatalog.deletedAt)
              )
            )
            .limit(1);

          if (service.length === 0) {
            throw new Error(
              `Layanan dengan ID ${item.serviceId} tidak ditemukan`
            );
          }
        }

        if (item.itemType === "Prescription") {
          if (!item.prescriptionId) {
            throw new Error(
              "Prescription ID diperlukan untuk tipe Prescription"
            );
          }

          // Verifikasi prescription exists
          const prescription = await tx
            .select()
            .from(prescriptions)
            .where(
              and(
                eq(prescriptions.id, item.prescriptionId),
                isNull(prescriptions.deletedAt)
              )
            )
            .limit(1);

          if (prescription.length === 0) {
            throw new Error(
              `Resep dengan ID ${item.prescriptionId} tidak ditemukan`
            );
          }
        }

        // Insert payment detail
        const [detail] = await tx
          .insert(paymentDetails)
          .values({
            paymentId: paymentId,
            itemType: item.itemType,
            serviceId: item.serviceId || null,
            prescriptionId: item.prescriptionId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: item.subtotal.toFixed(2),
            notes: item.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({
            id: paymentDetails.id,
            itemType: paymentDetails.itemType,
            quantity: paymentDetails.quantity,
            subtotal: paymentDetails.subtotal,
          });

        insertedDetails.push(detail);
      }

      // Update total amount di payment jika perlu
      const totalFromDetails = insertedDetails.reduce(
        (sum, detail) => sum + parseFloat(detail.subtotal),
        0
      );

      await tx
        .update(payments)
        .set({
          totalAmount: totalFromDetails.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      return insertedDetails;
    });

    return NextResponse.json(
      {
        message: "Detail pembayaran berhasil ditambahkan",
        details: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment details:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Mendapatkan payment details berdasarkan paymentId
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Receptionist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { message: "Payment ID diperlukan" },
        { status: 400 }
      );
    }

    // Query payment details dengan informasi terkait
    const details = await db
      .select({
        id: paymentDetails.id,
        paymentId: paymentDetails.paymentId,
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
      .leftJoin(serviceCatalog, eq(paymentDetails.serviceId, serviceCatalog.id))
      .where(
        and(
          eq(paymentDetails.paymentId, parseInt(paymentId)),
          isNull(paymentDetails.deletedAt)
        )
      );

    return NextResponse.json({
      data: details,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
