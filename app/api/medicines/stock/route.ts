// app/api/medicines/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, medicineStocks } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

// POST - Add new stock batch
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Pharmacist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      medicineId,
      batchNumber,
      quantity,
      expiryDate,
      supplier,
      purchasePrice,
    } = body;

    // Validasi input
    if (!medicineId || !batchNumber || !quantity || !expiryDate) {
      return NextResponse.json(
        {
          message:
            "MedicineId, batchNumber, quantity, dan expiryDate wajib diisi",
        },
        { status: 400 }
      );
    }

    // Check if medicine exists
    const medicine = await db.query.medicines.findFirst({
      where: and(eq(medicines.id, medicineId), isNull(medicines.deletedAt)),
    });

    if (!medicine) {
      return NextResponse.json(
        { message: "Medicine tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check duplicate batch number
    const existingBatch = await db.query.medicineStocks.findFirst({
      where: and(
        eq(medicineStocks.batchNumber, batchNumber),
        isNull(medicineStocks.deletedAt)
      ),
    });

    if (existingBatch) {
      return NextResponse.json(
        { message: "Batch number sudah ada" },
        { status: 409 }
      );
    }

    // Validate expiry date (tidak boleh sudah expired)
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiry <= today) {
      return NextResponse.json(
        { message: "Expiry date tidak boleh hari ini atau sudah lewat" },
        { status: 400 }
      );
    }

    // Insert new stock batch
    const [newStock] = await db
      .insert(medicineStocks)
      .values({
        medicineId,
        batchNumber,
        quantity,
        remainingQuantity: quantity, // Set remainingQuantity = quantity untuk stock baru
        expiryDate,
        supplier: supplier || null,
        purchasePrice: purchasePrice ? purchasePrice.toString() : null,
        addedAt: new Date(),
        isBelowThreshold: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Check and update threshold status
    const currentTotalStock = await db
      .select({
        total: sql<number>`
          COALESCE(SUM(${medicineStocks.remainingQuantity}), 0)::integer
        `,
      })
      .from(medicineStocks)
      .where(
        and(
          eq(medicineStocks.medicineId, medicineId),
          isNull(medicineStocks.deletedAt),
          sql`${medicineStocks.expiryDate} > CURRENT_DATE`
        )
      );

    const totalStock = currentTotalStock[0]?.total || 0;
    const thresholdAmount =
      (medicine.minimumStock * (100 + medicine.reorderThresholdPercentage)) /
      100;
    const isBelowThreshold = totalStock <= thresholdAmount;

    // Update threshold status untuk semua stock batch medicine ini
    await db
      .update(medicineStocks)
      .set({
        isBelowThreshold,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(medicineStocks.medicineId, medicineId),
          isNull(medicineStocks.deletedAt)
        )
      );

    return NextResponse.json({
      message: "Stock batch berhasil ditambahkan",
      data: {
        ...newStock,
        totalStock,
        isBelowThreshold,
      },
    });
  } catch (error) {
    console.error("Error adding stock batch:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - List stock batches dengan filter by medicineId
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const medicineId = searchParams.get("medicineId");

    if (!medicineId) {
      return NextResponse.json(
        { message: "MedicineId diperlukan" },
        { status: 400 }
      );
    }

    // Get medicine info
    const medicine = await db.query.medicines.findFirst({
      where: and(
        eq(medicines.id, parseInt(medicineId)),
        isNull(medicines.deletedAt)
      ),
    });

    if (!medicine) {
      return NextResponse.json(
        { message: "Medicine tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get stock batches ordered by expiry date (FEFO)
    const stockBatches = await db
      .select({
        id: medicineStocks.id,
        batchNumber: medicineStocks.batchNumber,
        quantity: medicineStocks.quantity,
        remainingQuantity: medicineStocks.remainingQuantity,
        expiryDate: medicineStocks.expiryDate,
        supplier: medicineStocks.supplier,
        purchasePrice: medicineStocks.purchasePrice,
        addedAt: medicineStocks.addedAt,
        isBelowThreshold: medicineStocks.isBelowThreshold,
        status: sql<string>`
          CASE 
            WHEN ${medicineStocks.expiryDate} < CURRENT_DATE THEN 'Expired'
            WHEN ${medicineStocks.remainingQuantity} = 0 THEN 'Empty'
            WHEN ${medicineStocks.remainingQuantity} < 10 THEN 'Low'
            ELSE 'Available'
          END
        `,
        daysUntilExpiry: sql<number>`
          GREATEST(0, DATE_PART('day', ${medicineStocks.expiryDate}::date - CURRENT_DATE))::integer
        `,
      })
      .from(medicineStocks)
      .where(
        and(
          eq(medicineStocks.medicineId, parseInt(medicineId)),
          isNull(medicineStocks.deletedAt)
        )
      )
      .orderBy(medicineStocks.expiryDate); // FEFO ordering

    // Calculate summary
    const summary = {
      totalBatches: stockBatches.length,
      totalQuantity: stockBatches.reduce((sum, s) => sum + s.quantity, 0),
      totalRemaining: stockBatches.reduce(
        (sum, s) => sum + s.remainingQuantity,
        0
      ),
      availableStock: stockBatches
        .filter((s) => s.status === "Available" || s.status === "Low")
        .reduce((sum, s) => sum + s.remainingQuantity, 0),
      expiredStock: stockBatches
        .filter((s) => s.status === "Expired")
        .reduce((sum, s) => sum + s.remainingQuantity, 0),
    };

    return NextResponse.json({
      medicine: {
        id: medicine.id,
        name: medicine.name,
        unit: medicine.unit,
        minimumStock: medicine.minimumStock,
        reorderThresholdPercentage: medicine.reorderThresholdPercentage,
      },
      stockBatches,
      summary,
    });
  } catch (error) {
    console.error("Error fetching stock batches:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
