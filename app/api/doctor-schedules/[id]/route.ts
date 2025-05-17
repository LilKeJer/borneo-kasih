// app/api/doctor-schedules/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { doctorSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - Mendapatkan jadwal spesifik
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const scheduleId = parseInt(resolvedParams.id);

    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId));

    if (schedule.length === 0) {
      return NextResponse.json(
        { message: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule[0]);
  } catch (error) {
    console.error("Error fetching doctor schedule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Memperbarui jadwal
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
    const scheduleId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { maxPatients, isActive } = body;

    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId));

    if (schedule.length === 0) {
      return NextResponse.json(
        { message: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Update jadwal
    const [updatedSchedule] = await db
      .update(doctorSchedules)
      .set({
        maxPatients: maxPatients || schedule[0].maxPatients,
        isActive: isActive !== undefined ? isActive : schedule[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(doctorSchedules.id, scheduleId))
      .returning();

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error("Error updating doctor schedule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Menghapus jadwal (soft delete)
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
    const scheduleId = parseInt(resolvedParams.id);

    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId));

    if (schedule.length === 0) {
      return NextResponse.json(
        { message: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Soft delete jadwal
    await db
      .update(doctorSchedules)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(doctorSchedules.id, scheduleId));

    return NextResponse.json({ message: "Jadwal berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting doctor schedule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
