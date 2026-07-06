// app/api/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { doctorDetails, serviceCatalog, users } from "@/db/schema";
import { eq, and, isNull, ilike, desc, or } from "drizzle-orm";

const VALID_CATEGORIES = ["Konsultasi", "Pemeriksaan", "Tindakan", "Lainnya"];

const normalizeDoctorId = (value: unknown) => {
  if (value === undefined || value === null || value === "" || value === "none") {
    return null;
  }

  const doctorId = Number(value);
  return Number.isInteger(doctorId) && doctorId > 0 ? doctorId : NaN;
};

const validateDoctor = async (doctorId: number) => {
  const [doctor] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, doctorId),
        eq(users.role, "Doctor"),
        eq(users.status, "Active"),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  return doctor;
};

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
    const doctorIdParam = searchParams.get("doctorId");

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

    const sessionDoctorId =
      session.user.role === "Doctor" ? Number(session.user.id) : null;
    const requestedDoctorId =
      sessionDoctorId ?? (doctorIdParam ? Number(doctorIdParam) : null);

    if (requestedDoctorId !== null) {
      if (!Number.isInteger(requestedDoctorId) || requestedDoctorId <= 0) {
        return NextResponse.json(
          { message: "ID dokter tidak valid" },
          { status: 400 }
        );
      }

      conditions.push(
        or(
          isNull(serviceCatalog.doctorId),
          eq(serviceCatalog.doctorId, requestedDoctorId)
        )!
      );
    }

    // Query dengan kondisi
    const services = await db
      .select({
        id: serviceCatalog.id,
        name: serviceCatalog.name,
        description: serviceCatalog.description,
        basePrice: serviceCatalog.basePrice,
        category: serviceCatalog.category,
        doctorId: serviceCatalog.doctorId,
        doctorName: doctorDetails.name,
        doctorSpecialization: doctorDetails.specialization,
        isDoctorDefault: serviceCatalog.isDoctorDefault,
        isActive: serviceCatalog.isActive,
        createdAt: serviceCatalog.createdAt,
        updatedAt: serviceCatalog.updatedAt,
        deletedAt: serviceCatalog.deletedAt,
      })
      .from(serviceCatalog)
      .leftJoin(doctorDetails, eq(serviceCatalog.doctorId, doctorDetails.userId))
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
    const {
      name,
      description,
      basePrice,
      category,
      doctorId,
      isDoctorDefault = false,
      isActive = true,
    } = body;
    const normalizedDoctorId = normalizeDoctorId(doctorId);
    const shouldUseDoctorDefault = Boolean(isDoctorDefault);

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
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { message: "Kategori tidak valid" },
        { status: 400 }
      );
    }

    if (Number.isNaN(normalizedDoctorId)) {
      return NextResponse.json(
        { message: "Dokter terkait tidak valid" },
        { status: 400 }
      );
    }

    if (normalizedDoctorId !== null && !(await validateDoctor(normalizedDoctorId))) {
      return NextResponse.json(
        { message: "Dokter terkait tidak ditemukan atau tidak aktif" },
        { status: 400 }
      );
    }

    if (shouldUseDoctorDefault) {
      if (category !== "Konsultasi") {
        return NextResponse.json(
          { message: "Layanan otomatis dokter harus kategori Konsultasi" },
          { status: 400 }
        );
      }

      if (normalizedDoctorId === null) {
        return NextResponse.json(
          { message: "Pilih dokter terkait untuk layanan otomatis" },
          { status: 400 }
        );
      }

      if (isActive === false) {
        return NextResponse.json(
          { message: "Layanan otomatis dokter harus aktif" },
          { status: 400 }
        );
      }
    }

    // Cek apakah layanan dengan nama yang sama sudah ada
    const duplicateConditions = [
      eq(serviceCatalog.name, name),
      isNull(serviceCatalog.deletedAt),
    ];

    if (normalizedDoctorId === null) {
      duplicateConditions.push(isNull(serviceCatalog.doctorId));
    } else {
      duplicateConditions.push(eq(serviceCatalog.doctorId, normalizedDoctorId));
    }

    const existingService = await db
      .select()
      .from(serviceCatalog)
      .where(and(...duplicateConditions))
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
    const [newService] = await db.transaction(async (tx) => {
      if (shouldUseDoctorDefault && normalizedDoctorId !== null) {
        await tx
          .update(serviceCatalog)
          .set({
            isDoctorDefault: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(serviceCatalog.doctorId, normalizedDoctorId),
              eq(serviceCatalog.isDoctorDefault, true),
              isNull(serviceCatalog.deletedAt)
            )
          );
      }

      return tx
        .insert(serviceCatalog)
        .values({
          name,
          description: description || null,
          basePrice: priceString,
          category,
          doctorId: normalizedDoctorId,
          isDoctorDefault: shouldUseDoctorDefault,
          isActive: isActive === false ? false : true, // Default true jika tidak disebutkan
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    });

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
