// app/api/patient/payments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Patient") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patientId = parseInt(session.user.id);

    const patientPayments = await db
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
        and(eq(payments.patientId, patientId), isNull(payments.deletedAt))
      )
      .orderBy(desc(payments.paymentDate));

    return NextResponse.json({
      data: patientPayments,
    });
  } catch (error) {
    console.error("Error fetching patient payments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
