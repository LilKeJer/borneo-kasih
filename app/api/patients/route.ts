// app/api/patients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, patientDetails } from "@/db/schema";
import { eq, and, isNull, like, or, count } from "drizzle-orm";
import bcrypt from "bcrypt";
import { isValidEmail, normalizeEmail } from "@/lib/utils/email";

// GET - List all patients with search and filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin", "Doctor", "Nurse"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Build base conditions
    const baseConditions = [eq(users.role, "Patient"), isNull(users.deletedAt)];

    // Add search condition if exists
    const searchConditions = [];
    if (search) {
      searchConditions.push(
        or(
          like(patientDetails.name, `%${search}%`),
          like(patientDetails.nik, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    // Combine all conditions
    const whereClause = and(
      ...baseConditions,
      ...(searchConditions.length > 0 ? searchConditions : [])
    );

    // Main query - now includes status from users table
    const patientsQuery = db
      .select({
        id: users.id,
        status: users.status, // <-- Ambil status dari tabel users
        createdAt: users.createdAt,
        name: patientDetails.name,
        nik: patientDetails.nik,
        email: users.email,
        phone: patientDetails.phone,
        dateOfBirth: patientDetails.dateOfBirth,
        address: patientDetails.address,
        gender: patientDetails.gender,
      })
      .from(users)
      .leftJoin(patientDetails, eq(users.id, patientDetails.userId))
      .where(whereClause);

    // Count query
    const totalCountQuery = db
      .select({ count: count() })
      .from(users)
      .leftJoin(patientDetails, eq(users.id, patientDetails.userId))
      .where(whereClause);

    // Execute queries
    const [patients, totalResult] = await Promise.all([
      patientsQuery.limit(limit).offset(offset),
      totalCountQuery,
    ]);

    return NextResponse.json({
      data: patients, // <-- Sekarang setiap pasien memiliki status dari database
      pagination: {
        page,
        limit,
        total: totalResult[0]?.count || 0,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const password =
      typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const nik = typeof body.nik === "string" ? body.nik.trim() : "";
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const dateOfBirth =
      typeof body.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
    const address =
      typeof body.address === "string" ? body.address.trim() : "";
    const gender = body.gender === "L" || body.gender === "P" ? body.gender : "";

    if (
      !password ||
      !name ||
      !nik ||
      !email ||
      !phone ||
      !dateOfBirth ||
      !address ||
      !gender
    ) {
      return NextResponse.json(
        { message: "Semua field pasien wajib diisi" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    if (!/^\d{16}$/.test(nik)) {
      return NextResponse.json(
        { message: "NIK harus 16 digit angka" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "Format email tidak valid" },
        { status: 400 }
      );
    }

    if (!/^[0-9+\-\s()]{10,20}$/.test(phone)) {
      return NextResponse.json(
        { message: "Format nomor telepon tidak valid" },
        { status: 400 }
      );
    }

    const parsedDateOfBirth = new Date(dateOfBirth);
    if (Number.isNaN(parsedDateOfBirth.getTime())) {
      return NextResponse.json(
        { message: "Tanggal lahir tidak valid" },
        { status: 400 }
      );
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email sudah digunakan" },
        { status: 409 }
      );
    }

    const existingNIK = await db.query.patientDetails.findFirst({
      where: eq(patientDetails.nik, nik),
    });

    if (existingNIK) {
      return NextResponse.json(
        { message: "NIK sudah terdaftar" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          role: "Patient",
          status: "Verified",
          verifiedAt: new Date(),
          verifiedBy: Number.parseInt(session.user.id, 10),
        })
        .returning({ id: users.id });

      await tx.insert(patientDetails).values({
        userId: newUser.id,
        name,
        nik,
        email,
        phone,
        dateOfBirth: parsedDateOfBirth,
        address,
        gender,
      });
    });

    return NextResponse.json(
      { message: "Pasien berhasil ditambahkan dan langsung terverifikasi" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
