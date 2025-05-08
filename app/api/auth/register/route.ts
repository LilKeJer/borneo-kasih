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
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // Cek jika username sudah ada
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Username already taken" },
        { status: 400 }
      );
    }

    // Cek jika NIK sudah terdaftar
    const existingNIK = await db.query.patientDetails.findFirst({
      where: eq(patientDetails.nik, nik),
    });

    if (existingNIK) {
      return NextResponse.json(
        { message: "NIK already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user baru
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        role: "Patient",
      })
      .returning({ id: users.id });

    // Buat detail pasien
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
      { message: "Registration successful" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
