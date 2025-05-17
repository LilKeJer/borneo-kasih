// app/api/practice-sessions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { practiceSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - Mendapatkan sesi spesifik
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
    const sessionId = parseInt(resolvedParams.id);

    const practiceSession = await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, sessionId));

    if (practiceSession.length === 0) {
      return NextResponse.json(
        { message: "Sesi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(practiceSession[0]);
  } catch (error) {
    console.error("Error fetching practice session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Memperbarui sesi
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sessionId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { name, startTime, endTime, description } = body;

    const practiceSession = await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, sessionId));

    if (practiceSession.length === 0) {
      return NextResponse.json(
        { message: "Sesi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi format waktu jika diubah
    if (startTime && endTime) {
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
    }

    // Update sesi
    const [updatedSession] = await db
      .update(practiceSessions)
      .set({
        name: name || practiceSession[0].name,
        startTime: startTime
          ? new Date(startTime)
          : practiceSession[0].startTime,
        endTime: endTime ? new Date(endTime) : practiceSession[0].endTime,
        description:
          description !== undefined
            ? description
            : practiceSession[0].description,
        updatedAt: new Date(),
      })
      .where(eq(practiceSessions.id, sessionId))
      .returning();

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error updating practice session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Menghapus sesi (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sessionId = parseInt(resolvedParams.id);

    const practiceSession = await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, sessionId));

    if (practiceSession.length === 0) {
      return NextResponse.json(
        { message: "Sesi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Soft delete sesi
    await db
      .update(practiceSessions)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(practiceSessions.id, sessionId));

    return NextResponse.json({ message: "Sesi berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting practice session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
