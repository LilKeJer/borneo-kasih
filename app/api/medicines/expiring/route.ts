// app/api/medicines/expiring/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, medicineStocks } from "@/db/schema";
import { eq, and, isNull, sql, gt, lte, asc } from "drizzle-orm";

interface StatusGroup {
  count: number;
  totalQuantity: number;
  estimatedValue: number;
  items: Array<{
    stockId: string;
    medicineId: string;
    medicineName: string;
    medicineCategory: string;
    medicineUnit: string;
    batchNumber: string;
    quantity: number;
    remainingQuantity: number;
    expiryDate: Date;
    supplier: string;
    daysRemaining: number;
    expiryStatus: string;
    estimatedValue: number;
  }>;
}

interface MedicineGroup {
  medicineId: string;
  medicineName: string;
  medicineCategory: string;
  medicineUnit: string;
  totalBatches: number;
  totalQuantity: number;
  estimatedValue: number;
  nearestExpiryDate: Date;
  batches: Array<{
    batchNumber: string;
    remainingQuantity: number;
    expiryDate: Date;
    daysRemaining: number;
    status: string;
  }>;
}

// GET - Medicines nearing expiry
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days") || "30";
    const includeExpired = searchParams.get("includeExpired") === "true";
    const days = parseInt(daysParam);

    // Validate days parameter
    if (isNaN(days) || days < 0) {
      return NextResponse.json(
        { message: "Parameter 'days' harus berupa angka positif" },
        { status: 400 }
      );
    }

    // Build conditions
    const conditions = [
      isNull(medicineStocks.deletedAt),
      gt(medicineStocks.remainingQuantity, 0), // Hanya yang masih ada stock
    ];

    if (includeExpired) {
      // Include yang sudah expired dan yang akan expired
      conditions.push(
        lte(
          medicineStocks.expiryDate,
          sql`CURRENT_DATE + INTERVAL '${days} days'`
        )
      );
    } else {
      // Hanya yang belum expired tapi akan expired dalam X hari
      conditions.push(
        and(
          gt(medicineStocks.expiryDate, sql`CURRENT_DATE`),
          lte(
            medicineStocks.expiryDate,
            sql`CURRENT_DATE + INTERVAL ${days} days`
          )
        )!
      );
    }

    // Query stocks yang mendekati atau sudah expired
    const expiringStocks = await db
      .select({
        stockId: medicineStocks.id,
        medicineId: medicineStocks.medicineId,
        medicineName: medicines.name,
        medicineCategory: medicines.category,
        medicineUnit: medicines.unit,
        batchNumber: medicineStocks.batchNumber,
        quantity: medicineStocks.quantity,
        remainingQuantity: medicineStocks.remainingQuantity,
        expiryDate: medicineStocks.expiryDate,
        supplier: medicineStocks.supplier,
        daysRemaining: sql<number>`
          DATE_PART('day', ${medicineStocks.expiryDate}::date - CURRENT_DATE)::integer
        `,
        expiryStatus: sql<string>`
          CASE 
            WHEN ${medicineStocks.expiryDate} < CURRENT_DATE THEN 'Expired'
            WHEN ${medicineStocks.expiryDate} = CURRENT_DATE THEN 'Expiring Today'
            WHEN ${medicineStocks.expiryDate} <= CURRENT_DATE + INTERVAL '7 days' THEN 'Expiring This Week'
            WHEN ${medicineStocks.expiryDate} <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring This Month'
            ELSE 'Expiring Soon'
          END
        `,
        estimatedValue: sql<number>`
          ROUND((${medicineStocks.remainingQuantity} * ${medicines.price})::numeric, 2)
        `,
      })
      .from(medicineStocks)
      .innerJoin(medicines, eq(medicineStocks.medicineId, medicines.id))
      .where(and(...conditions))
      .orderBy(asc(medicineStocks.expiryDate)); // Order by expiry date ascending

    // Group by status untuk summary
    const statusGroups = expiringStocks.reduce((groups, stock) => {
      const status = stock.expiryStatus;
      if (!groups[status]) {
        groups[status] = {
          count: 0,
          totalQuantity: 0,
          estimatedValue: 0,
          items: [],
        };
      }
      groups[status].count++;
      groups[status].totalQuantity += stock.remainingQuantity;
      groups[status].estimatedValue += Number(stock.estimatedValue) || 0;
      groups[status].items.push({
        stockId: stock.stockId.toString(),
        medicineId: stock.medicineId.toString(),
        medicineName: stock.medicineName,
        medicineCategory: stock.medicineCategory?.toString() || "",
        medicineUnit: stock.medicineUnit?.toString() || "",
        batchNumber: stock.batchNumber,
        quantity: stock.quantity,
        remainingQuantity: stock.remainingQuantity,
        expiryDate: new Date(stock.expiryDate),
        supplier: stock.supplier?.toString() || "",
        daysRemaining: stock.daysRemaining,
        expiryStatus: stock.expiryStatus,
        estimatedValue: Number(stock.estimatedValue) || 0,
      });
      return groups;
    }, {} as Record<string, StatusGroup>);

    // Group by medicine untuk melihat total per obat
    const medicineGroups = expiringStocks.reduce((groups, stock) => {
      const medicineId = stock.medicineId;
      if (!groups[medicineId]) {
        groups[medicineId] = {
          medicineId: stock.medicineId.toString(),
          medicineName: stock.medicineName,
          medicineCategory: stock.medicineCategory?.at(0) || "",
          medicineUnit: stock.medicineUnit?.at(0) || "",
          totalBatches: 0,
          totalQuantity: 0,
          estimatedValue: 0,
          nearestExpiryDate: new Date(stock.expiryDate),
          batches: [],
        };
      }
      groups[medicineId].totalBatches++;
      groups[medicineId].totalQuantity += stock.remainingQuantity;
      groups[medicineId].estimatedValue += Number(stock.estimatedValue) || 0;
      groups[medicineId].batches.push({
        batchNumber: stock.batchNumber,
        remainingQuantity: stock.remainingQuantity,
        expiryDate: new Date(stock.expiryDate),
        daysRemaining: stock.daysRemaining,
        status: stock.expiryStatus,
      });
      return groups;
    }, {} as Record<string, MedicineGroup>);

    // Calculate summary statistics
    const summary = {
      totalBatches: expiringStocks.length,
      totalMedicines: Object.keys(medicineGroups).length,
      totalQuantity: expiringStocks.reduce(
        (sum, s) => sum + s.remainingQuantity,
        0
      ),
      totalEstimatedValue: expiringStocks.reduce(
        (sum, s) => sum + Number(s.estimatedValue || 0),
        0
      ),
      expiredCount: expiringStocks.filter((s) => s.daysRemaining < 0).length,
      expiringTodayCount: expiringStocks.filter((s) => s.daysRemaining === 0)
        .length,
      expiringThisWeekCount: expiringStocks.filter(
        (s) => s.daysRemaining > 0 && s.daysRemaining <= 7
      ).length,
      expiringThisMonthCount: expiringStocks.filter(
        (s) => s.daysRemaining > 7 && s.daysRemaining <= 30
      ).length,
    };

    // Sort medicine groups by nearest expiry date
    const sortedMedicineGroups = Object.values(medicineGroups).sort((a, b) => {
      const dateA = new Date(a.nearestExpiryDate);
      const dateB = new Date(b.nearestExpiryDate);
      return dateA.getTime() - dateB.getTime();
    });

    return NextResponse.json({
      summary,
      statusBreakdown: statusGroups,
      medicineGroups: sortedMedicineGroups,
      allBatches: expiringStocks,
      queryParams: {
        days,
        includeExpired,
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
