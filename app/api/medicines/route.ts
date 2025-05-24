// app/api/medicines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, medicineStocks } from "@/db/schema";
import { eq, and, isNull, ilike, desc, asc, sql } from "drizzle-orm";

// GET - Mendapatkan semua obat dengan informasi stok
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const lowStock = searchParams.get("lowStock") === "true";

    // Query obat dengan informasi stok
    const medicinesWithStock = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        description: medicines.description,
        price: medicines.price,
        minimumStock: medicines.minimumStock,
        reorderThresholdPercentage: medicines.reorderThresholdPercentage,
        pharmacistId: medicines.pharmacistId,
        createdAt: medicines.createdAt,
        updatedAt: medicines.updatedAt,
        // Aggregate stock information
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
      .where(
        and(
          isNull(medicines.deletedAt),
          search ? ilike(medicines.name, `%${search}%`) : undefined
        )
      )
      .groupBy(medicines.id)
      .orderBy(
        sortOrder === "asc"
          ? asc(sql`${medicines[sortBy as keyof typeof medicines]}`)
          : desc(sql`${medicines[sortBy as keyof typeof medicines]}`)
      )
      .limit(limit)
      .offset(offset);

    // Calculate threshold status
    const medicinesWithThresholdStatus = medicinesWithStock.map((medicine) => {
      const totalStock = Number(medicine.totalStock) || 0;
      const minimumStock = medicine.minimumStock || 0;
      const thresholdPercentage = medicine.reorderThresholdPercentage || 20;

      // Calculate threshold stock level
      const thresholdStock =
        minimumStock + (minimumStock * thresholdPercentage) / 100;
      const isBelowThreshold = totalStock <= thresholdStock;
      const stockPercentage =
        minimumStock > 0 ? (totalStock / minimumStock) * 100 : 100;

      return {
        ...medicine,
        totalStock,
        isBelowThreshold,
        thresholdStock,
        stockPercentage,
      };
    });

    // Filter by low stock if requested
    const filteredMedicines = lowStock
      ? medicinesWithThresholdStatus.filter((m) => m.isBelowThreshold)
      : medicinesWithThresholdStatus;

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${medicines.id})` })
      .from(medicines)
      .where(
        and(
          isNull(medicines.deletedAt),
          search ? ilike(medicines.name, `%${search}%`) : undefined
        )
      );

    return NextResponse.json({
      data: filteredMedicines,
      pagination: {
        page,
        limit,
        total: Number(totalCount[0]?.count) || 0,
        totalPages: Math.ceil((Number(totalCount[0]?.count) || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Tambah obat baru
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Pharmacist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      price,
      minimumStock = 5,
      reorderThresholdPercentage = 20,
    } = body;

    // Validasi input
    if (!name || !price) {
      return NextResponse.json(
        { message: "Nama dan harga obat wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi harga
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { message: "Harga harus berupa angka positif" },
        { status: 400 }
      );
    }

    // Validasi minimum stock
    if (minimumStock < 0) {
      return NextResponse.json(
        { message: "Stok minimum tidak boleh negatif" },
        { status: 400 }
      );
    }

    // Validasi threshold percentage
    if (reorderThresholdPercentage < 0 || reorderThresholdPercentage > 100) {
      return NextResponse.json(
        { message: "Persentase threshold harus antara 0 dan 100" },
        { status: 400 }
      );
    }

    // Cek apakah obat dengan nama yang sama sudah ada
    const existingMedicine = await db
      .select()
      .from(medicines)
      .where(and(eq(medicines.name, name), isNull(medicines.deletedAt)))
      .limit(1);

    if (existingMedicine.length > 0) {
      return NextResponse.json(
        { message: "Obat dengan nama yang sama sudah ada" },
        { status: 409 }
      );
    }

    const pharmacistId = parseInt(session.user.id);

    // Buat obat baru
    const [newMedicine] = await db
      .insert(medicines)
      .values({
        name,
        description: description || null,
        price: priceNum.toFixed(2),
        minimumStock,
        reorderThresholdPercentage,
        pharmacistId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: "Obat berhasil ditambahkan",
        data: newMedicine,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating medicine:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
