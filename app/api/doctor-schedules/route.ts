// app/api/doctor-schedules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { doctorSchedules, practiceSessions, doctorDetails } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Mendapatkan semua jadwal dokter
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ambil dokter ID dari query parameter (opsional)
    // const { searchParams } = new URL(req.url);
    //const doctorId = searchParams.get("doctorId");

    // Buat base query
    const query = db
      .select({
        id: doctorSchedules.id,
        doctorId: doctorSchedules.doctorId,
        doctorName: doctorDetails.name,
        sessionId: doctorSchedules.sessionId,
        sessionName: practiceSessions.name,
        startTime: practiceSessions.startTime,
        endTime: practiceSessions.endTime,
        dayOfWeek: doctorSchedules.dayOfWeek,
        maxPatients: doctorSchedules.maxPatients,
        isActive: doctorSchedules.isActive,
      })
      .from(doctorSchedules)
      .leftJoin(
        practiceSessions,
        eq(doctorSchedules.sessionId, practiceSessions.id)
      )
      .leftJoin(
        doctorDetails,
        eq(doctorSchedules.doctorId, doctorDetails.userId)
      )
      .where(isNull(doctorSchedules.deletedAt));

    const schedules = await query;

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching doctor schedules:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Menambahkan jadwal baru
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { doctorId, sessionId, dayOfWeek, maxPatients } = body;

    if (!doctorId || !sessionId || dayOfWeek === undefined) {
      return NextResponse.json(
        { message: "Dokter, sesi, dan hari wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi hari
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { message: "Hari harus antara 0 (Minggu) dan 6 (Sabtu)" },
        { status: 400 }
      );
    }

    // Cek apakah jadwal sudah ada
    const existingSchedule = await db
      .select()
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.doctorId, doctorId),
          eq(doctorSchedules.sessionId, sessionId),
          eq(doctorSchedules.dayOfWeek, dayOfWeek),
          isNull(doctorSchedules.deletedAt)
        )
      );

    if (existingSchedule.length > 0) {
      return NextResponse.json(
        { message: "Jadwal untuk dokter, sesi, dan hari ini sudah ada" },
        { status: 409 }
      );
    }

    // Tambahkan jadwal baru
    const [newSchedule] = await db
      .insert(doctorSchedules)
      .values({
        doctorId,
        sessionId,
        dayOfWeek,
        maxPatients: maxPatients || 30,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error("Error creating doctor schedule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
