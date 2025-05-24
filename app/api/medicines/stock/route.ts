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
    const { medicineId, quantity, batchNumber, expiryDate } = body;

    // Validate inputs
    if (!medicineId || !quantity || !expiryDate) {
      return NextResponse.json(
        { message: "ID obat, jumlah, dan tanggal kadaluarsa wajib diisi" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { message: "Jumlah harus lebih dari 0" },
        { status: 400 }
      );
    }

    // Validate expiry date
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiry <= today) {
      return NextResponse.json(
        { message: "Tanggal kadaluarsa harus lebih dari hari ini" },
        { status: 400 }
      );
    }

    // Check if medicine exists
    const medicine = await db
      .select()
      .from(medicines)
      .where(and(eq(medicines.id, medicineId), isNull(medicines.deletedAt)))
      .limit(1);

    if (medicine.length === 0) {
      return NextResponse.json(
        { message: "Obat tidak ditemukan" },
        { status: 404 }
      );
    }

    // Add new stock
    const [newStock] = await db
      .insert(medicineStocks)
      .values({
        medicineId,
        quantity,
        remainingQuantity: quantity,
        batchNumber: batchNumber || null,
        expiryDate: expiry.toISOString().split("T")[0],
        addedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Check if stock is below threshold after adding
    const totalStock = await db
      .select({
        total: sql<number>`COALESCE(SUM(${medicineStocks.remainingQuantity}), 0)::integer`,
      })
      .from(medicineStocks)
      .where(
        and(
          eq(medicineStocks.medicineId, medicineId),
          isNull(medicineStocks.deletedAt)
        )
      );

    const currentStock = Number(totalStock[0]?.total) || 0;
    const minimumStock = medicine[0].minimumStock || 0;
    const thresholdPercentage = medicine[0].reorderThresholdPercentage || 20;
    const thresholdStock =
      minimumStock + (minimumStock * thresholdPercentage) / 100;

    // Update threshold status if needed
    if (currentStock <= thresholdStock) {
      await db
        .update(medicineStocks)
        .set({ isBelowThreshold: true })
        .where(eq(medicineStocks.id, newStock.id));
    }

    return NextResponse.json(
      {
        message: "Stok berhasil ditambahkan",
        data: {
          ...newStock,
          currentTotalStock: currentStock,
          isBelowThreshold: currentStock <= thresholdStock,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding stock:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
