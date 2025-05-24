// app/api/medicines/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { medicines } from "@/db/schema";
import { eq, and, isNull, InferInsertModel } from "drizzle-orm";

// Define a type for the updatable fields of a medicine
// This makes the updateData object more type-safe
type MedicineUpdateData = Partial<
  Omit<
    InferInsertModel<typeof medicines>,
    "id" | "pharmacistId" | "createdAt" | "deletedAt"
  >
> & {
  updatedAt: Date;
  description?: string | null; // Explicitly allow null for description
};

// GET - Get single medicine
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const medicineId = parseInt(resolvedParams.id);

    if (isNaN(medicineId)) {
      return NextResponse.json(
        { message: "ID obat tidak valid" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(medicine[0]);
  } catch (error) {
    console.error("Error fetching medicine:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update medicine data and threshold
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Pharmacist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const medicineId = parseInt(resolvedParams.id);

    if (isNaN(medicineId)) {
      return NextResponse.json(
        { message: "ID obat tidak valid" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      price,
      minimumStock,
      reorderThresholdPercentage,
    } = body;

    // Check if medicine exists
    const existingMedicine = await db
      .select()
      .from(medicines)
      .where(and(eq(medicines.id, medicineId), isNull(medicines.deletedAt)))
      .limit(1);

    if (existingMedicine.length === 0) {
      return NextResponse.json(
        { message: "Obat tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validate inputs if provided
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { message: "Harga harus berupa angka positif" },
          { status: 400 }
        );
      }
    }

    if (minimumStock !== undefined && minimumStock < 0) {
      return NextResponse.json(
        { message: "Stok minimum tidak boleh negatif" },
        { status: 400 }
      );
    }

    if (
      reorderThresholdPercentage !== undefined &&
      (reorderThresholdPercentage < 0 || reorderThresholdPercentage > 100)
    ) {
      return NextResponse.json(
        { message: "Persentase threshold harus antara 0 dan 100" },
        { status: 400 }
      );
    }

    // Update medicine
    const updateData: MedicineUpdateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (price !== undefined) updateData.price = parseFloat(price).toFixed(2);
    if (minimumStock !== undefined) updateData.minimumStock = minimumStock;
    if (reorderThresholdPercentage !== undefined) {
      updateData.reorderThresholdPercentage = reorderThresholdPercentage;
    }

    const [updatedMedicine] = await db
      .update(medicines)
      .set(updateData)
      .where(eq(medicines.id, medicineId))
      .returning();

    return NextResponse.json({
      message: "Obat berhasil diperbarui",
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Pharmacist", "Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const medicineId = parseInt(resolvedParams.id);

    if (isNaN(medicineId)) {
      return NextResponse.json(
        { message: "ID obat tidak valid" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(medicines)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(medicines.id, medicineId));

    return NextResponse.json({
      message: "Obat berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting medicine:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
