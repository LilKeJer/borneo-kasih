// app/api/medicines/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, medicineStocks } from "@/db/schema";
import { eq, and, isNull, ne, gte, sql } from "drizzle-orm";

// GET - Get medicine detail dengan semua stock batches
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const medicineId = parseInt(params.id);

    // Get medicine data
    const medicine = await db.query.medicines.findFirst({
      where: and(eq(medicines.id, medicineId), isNull(medicines.deletedAt)),
    });

    if (!medicine) {
      return NextResponse.json(
        { message: "Medicine tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get all stock batches untuk medicine ini
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
        status: sql<string>`
          CASE 
            WHEN ${medicineStocks.expiryDate} < CURRENT_DATE THEN 'Expired'
            WHEN ${medicineStocks.remainingQuantity} = 0 THEN 'Empty'
            WHEN ${medicineStocks.remainingQuantity} < 10 THEN 'Low'
            ELSE 'Available'
          END
        `,
      })
      .from(medicineStocks)
      .where(
        and(
          eq(medicineStocks.medicineId, medicineId),
          isNull(medicineStocks.deletedAt)
        )
      )
      .orderBy(medicineStocks.expiryDate); // FEFO ordering

    // Calculate total available quantity (non-expired stocks)
    const totalAvailable = stockBatches
      .filter((stock) => {
        const expiryDate = new Date(stock.expiryDate);
        const today = new Date();
        return expiryDate > today && stock.remainingQuantity > 0;
      })
      .reduce((sum, stock) => sum + stock.remainingQuantity, 0);

    // Calculate status
    const minimumStock = medicine.minimumStock;
    const threshold = medicine.reorderThresholdPercentage;
    const thresholdAmount = (minimumStock * (100 + threshold)) / 100;

    let stockStatus = "Normal";
    if (totalAvailable === 0) {
      stockStatus = "Out of Stock";
    } else if (totalAvailable <= thresholdAmount) {
      stockStatus = "Low Stock";
    }

    return NextResponse.json({
      data: {
        ...medicine,
        stockBatches,
        totalAvailable,
        stockStatus,
        thresholdAmount: Math.ceil(thresholdAmount),
      },
    });
  } catch (error) {
    console.error("Error fetching medicine detail:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update medicine
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Pharmacist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const medicineId = parseInt(params.id);
    const body = await req.json();
    const {
      name,
      description,
      category,
      unit,
      price,
      minimumStock,
      reorderThresholdPercentage,
      isActive,
    } = body;

    // Check if medicine exists
    const existingMedicine = await db.query.medicines.findFirst({
      where: and(eq(medicines.id, medicineId), isNull(medicines.deletedAt)),
    });

    if (!existingMedicine) {
      return NextResponse.json(
        { message: "Medicine tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check duplicate name (exclude current)
    if (name && name !== existingMedicine.name) {
      const duplicateMedicine = await db.query.medicines.findFirst({
        where: and(
          eq(medicines.name, name),
          ne(medicines.id, medicineId),
          isNull(medicines.deletedAt)
        ),
      });

      if (duplicateMedicine) {
        return NextResponse.json(
          { message: "Medicine dengan nama tersebut sudah ada" },
          { status: 409 }
        );
      }
    }

    // Validasi threshold percentage jika diupdate
    if (
      reorderThresholdPercentage !== undefined &&
      (reorderThresholdPercentage < 0 || reorderThresholdPercentage > 100)
    ) {
      return NextResponse.json(
        { message: "Reorder threshold percentage harus antara 0-100" },
        { status: 400 }
      );
    }

    // Update medicine data
    const updateData: Partial<{
      name: string;
      description: string;
      category: string;
      unit: string;
      price: string;
      minimumStock: number;
      reorderThresholdPercentage: number;
      isActive: boolean;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (unit !== undefined) updateData.unit = unit;
    if (price !== undefined) updateData.price = price.toString();
    if (minimumStock !== undefined) updateData.minimumStock = minimumStock;
    if (reorderThresholdPercentage !== undefined) {
      updateData.reorderThresholdPercentage = reorderThresholdPercentage;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedMedicine] = await db
      .update(medicines)
      .set(updateData)
      .where(eq(medicines.id, medicineId))
      .returning();

    // Check if stock needs threshold update
    if (
      minimumStock !== undefined ||
      reorderThresholdPercentage !== undefined
    ) {
      // Calculate new threshold amount
      const newMinimum = minimumStock || existingMedicine.minimumStock;
      const newThreshold =
        reorderThresholdPercentage ||
        existingMedicine.reorderThresholdPercentage;
      const thresholdAmount = (newMinimum * (100 + newThreshold)) / 100;

      // Get current total stock
      const currentStock = await db
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
            gte(medicineStocks.expiryDate, sql`CURRENT_DATE`)
          )
        );

      const totalStock = currentStock[0]?.total || 0;
      const isBelowThreshold = totalStock <= thresholdAmount;

      // Update stock threshold status
      await db
        .update(medicineStocks)
        .set({ isBelowThreshold })
        .where(
          and(
            eq(medicineStocks.medicineId, medicineId),
            isNull(medicineStocks.deletedAt)
          )
        );
    }

    return NextResponse.json({
      message: "Medicine berhasil diupdate",
      data: updatedMedicine,
    });
  } catch (error) {
    console.error("Error updating medicine:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete medicine
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Pharmacist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const medicineId = parseInt(params.id);

    // Check if medicine exists
    const existingMedicine = await db.query.medicines.findFirst({
      where: and(eq(medicines.id, medicineId), isNull(medicines.deletedAt)),
    });

    if (!existingMedicine) {
      return NextResponse.json(
        { message: "Medicine tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if there's active stock
    const activeStock = await db
      .select({
        total: sql<number>`
          COALESCE(SUM(${medicineStocks.remainingQuantity}), 0)::integer
        `,
      })
      .from(medicineStocks)
      .where(
        and(
          eq(medicineStocks.medicineId, medicineId),
          isNull(medicineStocks.deletedAt)
        )
      );

    const hasActiveStock = (activeStock[0]?.total || 0) > 0;

    if (hasActiveStock) {
      // Warning but still allow soft delete
      const [deletedMedicine] = await db
        .update(medicines)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(medicines.id, medicineId))
        .returning();

      return NextResponse.json({
        message: "Medicine dihapus dengan peringatan: masih ada stock aktif",
        warning: true,
        activeStock: activeStock[0]?.total,
        data: deletedMedicine,
      });
    }

    // Soft delete medicine
    const [deletedMedicine] = await db
      .update(medicines)
      .set({
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(medicines.id, medicineId))
      .returning();

    return NextResponse.json({
      message: "Medicine berhasil dihapus",
      data: deletedMedicine,
    });
  } catch (error) {
    console.error("Error deleting medicine:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
