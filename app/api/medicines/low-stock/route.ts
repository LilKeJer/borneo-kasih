// app/api/medicines/low-stock/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, medicineStocks } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Pharmacist", "Admin", "Doctor"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Query obat dengan stok di bawah threshold
    const lowStockMedicines = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        description: medicines.description,
        price: medicines.price,
        minimumStock: medicines.minimumStock,
        reorderThresholdPercentage: medicines.reorderThresholdPercentage,
        totalStock: sql<number>`COALESCE(SUM(${medicineStocks.remainingQuantity}), 0)::integer`,
        batchCount: sql<number>`COUNT(DISTINCT ${medicineStocks.id})::integer`,
      })
      .from(medicines)
      .leftJoin(
        medicineStocks,
        and(
          eq(medicines.id, medicineStocks.medicineId),
          isNull(medicineStocks.deletedAt)
        )
      )
      .where(isNull(medicines.deletedAt))
      .groupBy(medicines.id).having(sql`
        COALESCE(SUM(${medicineStocks.remainingQuantity}), 0) <= 
        ${medicines.minimumStock} + (${medicines.minimumStock} * ${medicines.reorderThresholdPercentage} / 100)
      `);

    // Transform results with additional calculations
    const results = lowStockMedicines.map((medicine) => {
      const totalStock = Number(medicine.totalStock) || 0;
      const minimumStock = medicine.minimumStock || 0;
      const thresholdPercentage = medicine.reorderThresholdPercentage || 20;
      const thresholdStock =
        minimumStock + (minimumStock * thresholdPercentage) / 100;
      const stockPercentage =
        minimumStock > 0 ? (totalStock / minimumStock) * 100 : 0;

      return {
        ...medicine,
        totalStock,
        thresholdStock,
        stockPercentage,
        status:
          totalStock === 0
            ? "Out of Stock"
            : totalStock <= minimumStock
            ? "Critical"
            : "Low Stock",
      };
    });

    return NextResponse.json({
      data: results,
      totalCount: results.length,
    });
  } catch (error) {
    console.error("Error fetching low stock medicines:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
