// app/api/medicines/expiring/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, medicineStocks } from "@/db/schema";
import { eq, and, isNull, lte, gte, sql, gt } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Pharmacist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Calculate date 30 days from now (obat yang akan kadaluarsa dalam 30 hari)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Query obat yang mendekati kadaluarsa
    const expiringMedicines = await db
      .select({
        id: medicineStocks.id,
        medicineId: medicines.id,
        medicineName: medicines.name,
        batchNumber: medicineStocks.batchNumber,
        expiryDate: medicineStocks.expiryDate,
        remainingQuantity: medicineStocks.remainingQuantity,
        addedAt: medicineStocks.addedAt,
        daysUntilExpiry: sql<number>`
          EXTRACT(DAY FROM ${medicineStocks.expiryDate}::date - CURRENT_DATE)::integer
        `,
      })
      .from(medicineStocks)
      .leftJoin(medicines, eq(medicineStocks.medicineId, medicines.id))
      .where(
        and(
          isNull(medicineStocks.deletedAt),
          isNull(medicines.deletedAt),
          gt(medicineStocks.remainingQuantity, 0),
          gte(medicineStocks.expiryDate, today.toISOString()),
          lte(medicineStocks.expiryDate, thirtyDaysFromNow.toISOString())
        )
      )
      .orderBy(medicineStocks.expiryDate);

    // Categorize by urgency
    const categorizedMedicines = expiringMedicines.map((item) => {
      const daysUntilExpiry = Number(item.daysUntilExpiry) || 0;

      return {
        ...item,
        daysUntilExpiry,
        urgency:
          daysUntilExpiry <= 7
            ? "Critical"
            : daysUntilExpiry <= 14
            ? "High"
            : daysUntilExpiry <= 21
            ? "Medium"
            : "Low",
      };
    });

    return NextResponse.json({
      data: categorizedMedicines,
      summary: {
        critical: categorizedMedicines.filter((m) => m.urgency === "Critical")
          .length,
        high: categorizedMedicines.filter((m) => m.urgency === "High").length,
        medium: categorizedMedicines.filter((m) => m.urgency === "Medium")
          .length,
        low: categorizedMedicines.filter((m) => m.urgency === "Low").length,
      },
    });
  } catch (error) {
    console.error("Error fetching expiring medicines:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
