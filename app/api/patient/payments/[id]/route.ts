// app/api/patient/payments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { paymentDetails, payments, serviceCatalog } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "Patient") {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    const resolvedParams = await params;
    const paymentId = parseInt(resolvedParams.id);

    if (Number.isNaN(paymentId)) {
      return NextResponse.json(
        { message: "Payment ID tidak valid" },
        { status: 400 }
      );
    }

    const patientId = parseInt(session.user.id);

    const payment = await db
      .select({
        id: payments.id,
        paymentDate: payments.paymentDate,
        totalAmount: payments.totalAmount,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        reservationId: payments.reservationId,
      })
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.patientId, patientId),
          isNull(payments.deletedAt)
        )
      )
      .limit(1);

    if (payment.length === 0) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 }
      );
    }

    const details = await db
      .select({
        id: paymentDetails.id,
        itemType: paymentDetails.itemType,
        serviceName: serviceCatalog.name,
        quantity: paymentDetails.quantity,
        unitPrice: paymentDetails.unitPrice,
        subtotal: paymentDetails.subtotal,
        notes: paymentDetails.notes,
      })
      .from(paymentDetails)
      .leftJoin(
        serviceCatalog,
        and(
          eq(paymentDetails.serviceId, serviceCatalog.id),
          isNull(serviceCatalog.deletedAt)
        )
      )
      .where(
        and(
          eq(paymentDetails.paymentId, paymentId),
          isNull(paymentDetails.deletedAt)
        )
      )
      .orderBy(paymentDetails.id);

    const normalizedDetails = details.map((detail) => ({
      ...detail,
      serviceName: detail.serviceName ?? null,
    }));

    return NextResponse.json({
      payment: payment[0],
      details: normalizedDetails,
    });
  } catch (error) {
    console.error("Error fetching payment detail:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
