// app/api/medicines/low-stock/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, medicineStocks } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

// GET - Medicines below threshold
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Query untuk mendapatkan medicines dengan total stock di bawah threshold
    const lowStockMedicines = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        category: medicines.category,
        unit: medicines.unit,
        minimumStock: medicines.minimumStock,
        reorderThresholdPercentage: medicines.reorderThresholdPercentage,
        currentStock: sql<number>`
          COALESCE(
            SUM(
              CASE 
                WHEN ${medicineStocks.deletedAt} IS NULL 
                AND ${medicineStocks.expiryDate} > CURRENT_DATE
                THEN ${medicineStocks.remainingQuantity} 
                ELSE 0 
              END
            ), 0
          )::integer
        `,
        // Hitung berapa batch yang mendekati expired (30 hari)
        expiringBatches: sql<number>`
          COUNT(
            CASE 
              WHEN ${medicineStocks.deletedAt} IS NULL 
              AND ${medicineStocks.remainingQuantity} > 0
              AND ${medicineStocks.expiryDate} > CURRENT_DATE
              AND ${medicineStocks.expiryDate} <= CURRENT_DATE + INTERVAL '30 days'
              THEN 1 
            END
          )::integer
        `,
        // Hitung berapa batch yang sudah expired
        expiredBatches: sql<number>`
          COUNT(
            CASE 
              WHEN ${medicineStocks.deletedAt} IS NULL 
              AND ${medicineStocks.remainingQuantity} > 0
              AND ${medicineStocks.expiryDate} <= CURRENT_DATE
              THEN 1 
            END
          )::integer
        `,
      })
      .from(medicines)
      .leftJoin(medicineStocks, eq(medicines.id, medicineStocks.medicineId))
      .where(and(isNull(medicines.deletedAt), eq(medicines.isActive, true)))
      .groupBy(medicines.id)
      .having(
        // Filter hanya yang di bawah threshold
        sql`
          COALESCE(
            SUM(
              CASE 
                WHEN ${medicineStocks.deletedAt} IS NULL 
                AND ${medicineStocks.expiryDate} > CURRENT_DATE
                THEN ${medicineStocks.remainingQuantity} 
                ELSE 0 
              END
            ), 0
          ) <= ${medicines.minimumStock} * (100 + ${medicines.reorderThresholdPercentage}) / 100
        `
      );

    // Process dan tambahkan informasi urgency
    const processedMedicines = lowStockMedicines.map((medicine) => {
      const thresholdAmount = Math.ceil(
        (medicine.minimumStock * (100 + medicine.reorderThresholdPercentage)) /
          100
      );
      const currentStock = medicine.currentStock;
      const stockPercentage =
        medicine.minimumStock > 0
          ? Math.round((currentStock / medicine.minimumStock) * 100)
          : 0;

      // Calculate urgency level
      let urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      let urgencyScore = 0;

      if (currentStock === 0) {
        urgencyLevel = "CRITICAL";
        urgencyScore = 100;
      } else if (currentStock <= medicine.minimumStock * 0.5) {
        urgencyLevel = "HIGH";
        urgencyScore = 75;
      } else if (currentStock <= medicine.minimumStock) {
        urgencyLevel = "MEDIUM";
        urgencyScore = 50;
      } else {
        urgencyLevel = "LOW";
        urgencyScore = 25;
      }

      // Adjust urgency based on expiring/expired batches
      if (medicine.expiredBatches > 0) {
        urgencyScore += 10;
      }
      if (medicine.expiringBatches > 0) {
        urgencyScore += 5;
      }

      // Calculate reorder quantity suggestion
      const reorderQuantity = Math.max(
        thresholdAmount * 2 - currentStock, // Order hingga 2x threshold
        medicine.minimumStock * 3 // Atau minimal 3x minimum stock
      );

      return {
        id: medicine.id,
        name: medicine.name,
        category: medicine.category,
        unit: medicine.unit,
        currentStock,
        minimumStock: medicine.minimumStock,
        thresholdAmount,
        reorderThresholdPercentage: medicine.reorderThresholdPercentage,
        stockPercentage,
        urgencyLevel,
        urgencyScore: Math.min(urgencyScore, 100),
        reorderQuantity: Math.ceil(reorderQuantity),
        expiringBatches: medicine.expiringBatches,
        expiredBatches: medicine.expiredBatches,
        stockGap: thresholdAmount - currentStock,
        status: currentStock === 0 ? "Out of Stock" : "Low Stock",
      };
    });

    // Sort by urgency (paling critical dulu)
    processedMedicines.sort((a, b) => {
      // First by urgency score
      if (b.urgencyScore !== a.urgencyScore) {
        return b.urgencyScore - a.urgencyScore;
      }
      // Then by stock gap
      return b.stockGap - a.stockGap;
    });

    // Summary statistics
    const summary = {
      totalLowStockMedicines: processedMedicines.length,
      criticalCount: processedMedicines.filter(
        (m) => m.urgencyLevel === "CRITICAL"
      ).length,
      highCount: processedMedicines.filter((m) => m.urgencyLevel === "HIGH")
        .length,
      mediumCount: processedMedicines.filter((m) => m.urgencyLevel === "MEDIUM")
        .length,
      lowCount: processedMedicines.filter((m) => m.urgencyLevel === "LOW")
        .length,
      outOfStockCount: processedMedicines.filter(
        (m) => m.status === "Out of Stock"
      ).length,
      totalReorderValue: processedMedicines.reduce(
        (sum, m) => sum + m.reorderQuantity,
        0
      ),
    };

    return NextResponse.json({
      summary,
      medicines: processedMedicines,
    });
  } catch (error) {
    console.error("Error fetching low stock medicines:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
