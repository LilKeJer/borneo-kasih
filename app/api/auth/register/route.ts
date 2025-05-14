// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/db";
import { users, patientDetails } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      username,
      password,
      name,
      nik,
      email,
      phone,
      dateOfBirth,
      address,
      gender,
    } = body;

    // Validasi input
    if (
      !username ||
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
        { message: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi format username
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      return NextResponse.json(
        {
          message:
            "Username hanya boleh huruf, angka, dan underscore (3-50 karakter)",
        },
        { status: 400 }
      );
    }

    // Validasi password
    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    // Validasi NIK
    if (!/^\d{16}$/.test(nik)) {
      return NextResponse.json(
        { message: "NIK harus 16 digit angka" },
        { status: 400 }
      );
    }

    // Validasi email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Format email tidak valid" },
        { status: 400 }
      );
    }

    // Validasi phone
    if (!/^[0-9+\-\s()]{10,20}$/.test(phone)) {
      return NextResponse.json(
        { message: "Format nomor telepon tidak valid" },
        { status: 400 }
      );
    }

    // Validasi gender
    if (!["L", "P"].includes(gender)) {
      return NextResponse.json(
        { message: "Gender harus L atau P" },
        { status: 400 }
      );
    }

    // Cek jika username sudah ada
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Username sudah digunakan" },
        { status: 400 }
      );
    }

    // Cek jika NIK sudah terdaftar
    const existingNIK = await db.query.patientDetails.findFirst({
      where: eq(patientDetails.nik, nik),
    });

    if (existingNIK) {
      return NextResponse.json(
        { message: "NIK sudah terdaftar" },
        { status: 400 }
      );
    }

    // Cek jika email sudah terdaftar
    const existingEmail = await db.query.patientDetails.findFirst({
      where: eq(patientDetails.email, email),
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user baru dengan status Pending untuk verifikasi
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        role: "Patient",
        status: "Pending", // Set status to Pending for new patients
      })
      .returning({ id: users.id });

    // Buat detail pasien dengan semua field yang required
    await db.insert(patientDetails).values({
      userId: newUser.id,
      name,
      nik,
      email,
      phone,
      dateOfBirth: new Date(dateOfBirth),
      address,
      gender,
    });

    return NextResponse.json(
      {
        message:
          "Registrasi berhasil! Akun Anda sedang menunggu verifikasi dari admin.",
        status: "pending",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan, silakan coba lagi" },
      { status: 500 }
    );
  }
}
