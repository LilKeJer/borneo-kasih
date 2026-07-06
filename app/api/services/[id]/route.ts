// app/api/services/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { doctorDetails, serviceCatalog, users } from "@/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";

type ServiceUpdateRequest = {
  name?: string;
  description?: string | null;
  basePrice?: number;
  category?: string;
  doctorId?: number | string | null;
  isDoctorDefault?: boolean;
  isActive?: boolean;
};

// Konstanta validasi
const VALID_CATEGORIES = ["Konsultasi", "Pemeriksaan", "Tindakan", "Lainnya"];
const MIN_PRICE = 0;

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

// GET - Mendapatkan layanan berdasarkan ID
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
    const serviceId = parseInt(resolvedParams.id);

    // Validasi ID
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { message: "ID layanan tidak valid" },
        { status: 400 }
      );
    }

    // Query layanan
    const service = await db
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
      .where(
        and(eq(serviceCatalog.id, serviceId), isNull(serviceCatalog.deletedAt))
      )
      .limit(1);

    if (service.length === 0) {
      return NextResponse.json(
        { message: "Layanan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(service[0]);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Mengupdate layanan
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autentikasi
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;

    // Validasi ID
    const serviceId = parseInt(resolvedParams.id, 10);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { message: "ID layanan tidak valid" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = (await req.json()) as ServiceUpdateRequest;

    // Validasi field-by-field
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { message: "Nama tidak boleh kosong" },
          { status: 400 }
        );
      }
    }

    if (body.basePrice !== undefined) {
      const price = Number(body.basePrice);
      if (isNaN(price)) {
        return NextResponse.json(
          { message: "Harga harus berupa angka" },
          { status: 400 }
        );
      }
      if (price < MIN_PRICE) {
        return NextResponse.json(
          { message: "Harga tidak boleh negatif" },
          { status: 400 }
        );
      }
    }

    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.includes(body.category)) {
        return NextResponse.json(
          { message: "Kategori tidak valid" },
          { status: 400 }
        );
      }
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { message: "Status aktif harus boolean" },
          { status: 400 }
        );
      }
    }

    if (body.isDoctorDefault !== undefined) {
      if (typeof body.isDoctorDefault !== "boolean") {
        return NextResponse.json(
          { message: "Status layanan otomatis harus boolean" },
          { status: 400 }
        );
      }
    }

    // Cek keberadaan layanan
    const existingService = await db.query.serviceCatalog.findFirst({
      where: and(
        eq(serviceCatalog.id, serviceId),
        isNull(serviceCatalog.deletedAt)
      ),
    });

    if (!existingService) {
      return NextResponse.json(
        { message: "Layanan tidak ditemukan" },
        { status: 404 }
      );
    }

    const normalizedDoctorId =
      body.doctorId === undefined
        ? existingService.doctorId
        : normalizeDoctorId(body.doctorId);

    if (Number.isNaN(normalizedDoctorId)) {
      return NextResponse.json(
        { message: "Dokter terkait tidak valid" },
        { status: 400 }
      );
    }

    if (
      normalizedDoctorId !== null &&
      !(await validateDoctor(normalizedDoctorId))
    ) {
      return NextResponse.json(
        { message: "Dokter terkait tidak ditemukan atau tidak aktif" },
        { status: 400 }
      );
    }

    const finalCategory = body.category ?? existingService.category;
    const finalIsActive = body.isActive ?? existingService.isActive ?? true;
    const finalIsDoctorDefault =
      body.isDoctorDefault ?? existingService.isDoctorDefault ?? false;

    if (finalIsDoctorDefault) {
      if (finalCategory !== "Konsultasi") {
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

      if (!finalIsActive) {
        return NextResponse.json(
          { message: "Layanan otomatis dokter harus aktif" },
          { status: 400 }
        );
      }
    }

    const duplicateConditions = [
      eq(serviceCatalog.name, body.name ?? existingService.name),
      ne(serviceCatalog.id, serviceId),
      isNull(serviceCatalog.deletedAt),
    ];

    if (normalizedDoctorId === null) {
      duplicateConditions.push(isNull(serviceCatalog.doctorId));
    } else {
      duplicateConditions.push(eq(serviceCatalog.doctorId, normalizedDoctorId));
    }

    const [duplicateService] = await db
      .select({ id: serviceCatalog.id })
      .from(serviceCatalog)
      .where(and(...duplicateConditions))
      .limit(1);

    if (duplicateService) {
      return NextResponse.json(
        { message: "Layanan dengan nama yang sama sudah ada" },
        { status: 409 }
      );
    }

    // Membuat data update
    const updateData = {
      updatedAt: new Date(),
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.basePrice !== undefined && {
        basePrice: Number(body.basePrice).toFixed(2),
      }),
      ...(body.category && { category: body.category }),
      ...(body.doctorId !== undefined && { doctorId: normalizedDoctorId }),
      ...(body.isDoctorDefault !== undefined && {
        isDoctorDefault: finalIsDoctorDefault,
      }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    };

    // Eksekusi update
    const [updatedService] = await db.transaction(async (tx) => {
      if (finalIsDoctorDefault && normalizedDoctorId !== null) {
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
              ne(serviceCatalog.id, serviceId),
              isNull(serviceCatalog.deletedAt)
            )
          );
      }

      return tx
        .update(serviceCatalog)
        .set(updateData)
        .where(eq(serviceCatalog.id, serviceId))
        .returning();
    });

    return NextResponse.json({
      message: "Layanan berhasil diperbarui",
      data: updatedService,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
// DELETE - Soft delete layanan (mengubah isActive menjadi false dan mengisi deletedAt)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const serviceId = parseInt(resolvedParams.id);

    // Validasi ID
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { message: "ID layanan tidak valid" },
        { status: 400 }
      );
    }

    // Periksa apakah layanan ada
    const existingService = await db
      .select()
      .from(serviceCatalog)
      .where(
        and(eq(serviceCatalog.id, serviceId), isNull(serviceCatalog.deletedAt))
      )
      .limit(1);

    if (existingService.length === 0) {
      return NextResponse.json(
        { message: "Layanan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Soft delete layanan (mengubah isActive menjadi false dan mengisi deletedAt)
    await db
      .update(serviceCatalog)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceCatalog.id, serviceId));

    return NextResponse.json({
      message: "Layanan berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
