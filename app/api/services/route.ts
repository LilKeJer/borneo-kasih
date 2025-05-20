// app/api/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { serviceCatalog } from "@/db/schema";
import { eq, and, isNull, ilike, desc } from "drizzle-orm";

// GET - Mendapatkan semua layanan
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ambil parameter query
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const active = searchParams.get("active");

    // Buat kondisi query
    const conditions = [isNull(serviceCatalog.deletedAt)];

    // Filter berdasarkan pencarian
    if (search) {
      conditions.push(ilike(serviceCatalog.name, `%${search}%`));
    }

    // Filter berdasarkan kategori
    if (category) {
      conditions.push(eq(serviceCatalog.category, category));
    }

    // Filter berdasarkan status aktif
    if (active === "true") {
      conditions.push(eq(serviceCatalog.isActive, true));
    } else if (active === "false") {
      conditions.push(eq(serviceCatalog.isActive, false));
    }

    // Query dengan kondisi
    const services = await db
      .select()
      .from(serviceCatalog)
      .where(and(...conditions))
      .orderBy(desc(serviceCatalog.updatedAt))
      .limit(limit)
      .offset(offset);

    // Hitung total untuk paginasi
    const totalCount = await db
      .select({ count: serviceCatalog.id })
      .from(serviceCatalog)
      .where(and(...conditions));

    return NextResponse.json({
      data: services,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Membuat layanan baru
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, basePrice, category, isActive = true } = body;

    // Validasi input
    if (!name || !basePrice || !category) {
      return NextResponse.json(
        { message: "Nama, harga dasar, dan kategori wajib diisi" },
        { status: 400 }
      );
    }

    // Konversi basePrice ke number dan validasi
    const price = Number(basePrice);
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { message: "Harga dasar harus berupa angka positif" },
        { status: 400 }
      );
    }

    // Validasi kategori
    const validCategories = [
      "Konsultasi",
      "Pemeriksaan",
      "Tindakan",
      "Lainnya",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { message: "Kategori tidak valid" },
        { status: 400 }
      );
    }

    // Cek apakah layanan dengan nama yang sama sudah ada
    const existingService = await db
      .select()
      .from(serviceCatalog)
      .where(
        and(eq(serviceCatalog.name, name), isNull(serviceCatalog.deletedAt))
      )
      .limit(1);

    if (existingService.length > 0) {
      return NextResponse.json(
        { message: "Layanan dengan nama yang sama sudah ada" },
        { status: 409 }
      );
    }
    const priceString = String(basePrice);
    if (!/^\d+(\.\d{1,2})?$/.test(priceString)) {
      return NextResponse.json(
        { message: "Format harga tidak valid. Contoh format benar: 150000.00" },
        { status: 400 }
      );
    }
    // Buat layanan baru
    const [newService] = await db
      .insert(serviceCatalog)
      .values({
        name,
        description: description || null,
        basePrice: priceString,
        category,
        isActive: isActive === false ? false : true, // Default true jika tidak disebutkan
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: "Layanan berhasil ditambahkan",
        data: newService,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
