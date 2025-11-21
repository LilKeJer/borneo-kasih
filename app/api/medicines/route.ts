// app/api/medicines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines, medicineStocks } from "@/db/schema";
import { eq, and, isNull, sql, like, or } from "drizzle-orm";

// GET - List medicines dengan pagination, search, dan filter
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Pharmacist", "Admin", "Doctor"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const isActive = searchParams.get("isActive");

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [isNull(medicines.deletedAt)];

    if (search) {
      conditions.push(
        or(
          like(medicines.name, `%${search}%`),
          like(medicines.description, `%${search}%`)
        )!
      );
    }

    if (category) {
      conditions.push(eq(medicines.category, category));
    }

    if (isActive !== null && isActive !== undefined) {
      conditions.push(eq(medicines.isActive, isActive === "true"));
    }

    // Get medicines dengan total stock
    const medicinesQuery = db
      .select({
        id: medicines.id,
        name: medicines.name,
        description: medicines.description,
        category: medicines.category,
        unit: medicines.unit,
        price: medicines.price,
        minimumStock: medicines.minimumStock,
        reorderThresholdPercentage: medicines.reorderThresholdPercentage,
        isActive: medicines.isActive,
        totalStock: sql<number>`
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
        createdAt: medicines.createdAt,
        updatedAt: medicines.updatedAt,
      })
      .from(medicines)
      .leftJoin(medicineStocks, eq(medicines.id, medicineStocks.medicineId))
      .where(and(...conditions))
      .groupBy(medicines.id)
      .limit(limit)
      .offset(offset);

    const [medicinesList, totalCountResult] = await Promise.all([
      medicinesQuery,
      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(medicines)
        .where(and(...conditions)),
    ]);

    // Calculate status untuk setiap medicine
    const medicinesWithStatus = medicinesList.map((medicine) => {
      const totalStock = Number(medicine.totalStock);
      const minimumStock = medicine.minimumStock;
      const threshold = medicine.reorderThresholdPercentage;
      const thresholdAmount = (minimumStock * (100 + threshold)) / 100;

      let status = "Normal";
      if (totalStock === 0) {
        status = "Out of Stock";
      } else if (totalStock <= thresholdAmount) {
        status = "Low Stock";
      }

      return {
        ...medicine,
        totalStock,
        status,
        thresholdAmount: Math.ceil(thresholdAmount),
      };
    });

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: medicinesWithStatus,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
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

// POST - Create new medicine
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
      category,
      unit,
      price,
      minimumStock = 10,
      reorderThresholdPercentage = 20,
    } = body;

    // Validasi input
    if (!name || !price) {
      return NextResponse.json(
        { message: "Name dan price wajib diisi" },
        { status: 400 }
      );
    }

    // Check duplicate name
    const existingMedicine = await db.query.medicines.findFirst({
      where: and(eq(medicines.name, name), isNull(medicines.deletedAt)),
    });

    if (existingMedicine) {
      return NextResponse.json(
        { message: "Medicine dengan nama tersebut sudah ada" },
        { status: 409 }
      );
    }

    // Validasi threshold percentage
    if (reorderThresholdPercentage < 0 || reorderThresholdPercentage > 100) {
      return NextResponse.json(
        { message: "Reorder threshold percentage harus antara 0-100" },
        { status: 400 }
      );
    }

    // Insert medicine baru
    const [newMedicine] = await db
      .insert(medicines)
      .values({
        name,
        description,
        category,
        unit,
        pharmacistId: parseInt(session.user.id),
        price: price.toString(),
        minimumStock,
        reorderThresholdPercentage,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      message: "Medicine berhasil ditambahkan",
      data: newMedicine,
    });
  } catch (error) {
    console.error("Error creating medicine:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
