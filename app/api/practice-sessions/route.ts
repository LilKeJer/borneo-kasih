// app/api/practice-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { practiceSessions } from "@/db/schema";
import { isNull } from "drizzle-orm";

// GET - Mendapatkan semua sesi praktik
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const sessions = await db
      .select()
      .from(practiceSessions)
      .where(isNull(practiceSessions.deletedAt));

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching practice sessions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Membuat sesi praktik baru
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, startTime, endTime, description } = body;

    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { message: "Nama, waktu mulai, dan waktu selesai wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi format waktu
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { message: "Format waktu tidak valid" },
        { status: 400 }
      );
    }

    // Validasi waktu mulai < waktu selesai
    if (startDate >= endDate) {
      return NextResponse.json(
        { message: "Waktu mulai harus lebih awal dari waktu selesai" },
        { status: 400 }
      );
    }

    // Buat sesi baru
    const [newSession] = await db
      .insert(practiceSessions)
      .values({
        name,
        startTime: startDate,
        endTime: endDate,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error("Error creating practice session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
