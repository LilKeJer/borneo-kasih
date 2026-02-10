// app/api/pharmacist/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, payments, prescriptions } from "@/db/schema";
import { and, eq, gte, isNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Pharmacist") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingPrescriptionsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(prescriptions)
      .where(
        and(eq(prescriptions.dispenseStatus, "Pending"), isNull(prescriptions.deletedAt))
      );

    const readyForPickupResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.paymentStatus, "Paid"),
          eq(prescriptions.dispenseStatus, "Pending"),
          isNull(prescriptions.deletedAt)
        )
      );

    const inventoryCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(medicines)
      .where(and(isNull(medicines.deletedAt), eq(medicines.isActive, true)));

    const paymentsTodayResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${payments.totalAmount}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, "Paid"),
          gte(payments.paymentDate, today),
          sql`${payments.paymentDate} < ${tomorrow}`,
          isNull(payments.deletedAt)
        )
      );

    return NextResponse.json({
      pendingPrescriptions: Number(pendingPrescriptionsResult[0]?.count || 0),
      readyForPickup: Number(readyForPickupResult[0]?.count || 0),
      medicineInventoryCount: Number(inventoryCountResult[0]?.count || 0),
      transactionsToday: Number(paymentsTodayResult[0]?.count || 0),
      totalSalesToday: Number(paymentsTodayResult[0]?.total || 0),
    });
  } catch (error) {
    console.error("Error fetching pharmacist dashboard:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
