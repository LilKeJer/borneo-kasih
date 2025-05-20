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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch and parse the request body
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    const { doctorId, sessions, days, defaultMaxPatients = 30 } = body;

    // Enhanced validation with better error messages
    if (!doctorId) {
      return NextResponse.json(
        { message: "doctorId wajib diisi" },
        { status: 400 }
      );
    }

    if (!sessions) {
      return NextResponse.json(
        { message: "sessions wajib diisi" },
        { status: 400 }
      );
    }

    if (!days) {
      return NextResponse.json(
        { message: "days wajib diisi" },
        { status: 400 }
      );
    }

    if (!Array.isArray(sessions)) {
      return NextResponse.json(
        { message: "sessions harus berupa array" },
        { status: 400 }
      );
    }

    if (!Array.isArray(days)) {
      return NextResponse.json(
        { message: "days harus berupa array" },
        { status: 400 }
      );
    }

    if (sessions.length === 0) {
      return NextResponse.json(
        { message: "Minimal satu sesi harus dipilih" },
        { status: 400 }
      );
    }

    if (days.length === 0) {
      return NextResponse.json(
        { message: "Minimal satu hari harus dipilih" },
        { status: 400 }
      );
    }

    // Ensure doctorId is a number
    const doctorIdNumber = Number(doctorId);
    if (isNaN(doctorIdNumber)) {
      return NextResponse.json(
        { message: "doctorId harus berupa angka" },
        { status: 400 }
      );
    }

    // Validate each day object
    for (const day of days) {
      if (day === null || typeof day !== "object") {
        return NextResponse.json(
          { message: "Setiap hari harus berupa objek" },
          { status: 400 }
        );
      }

      if (day.dayOfWeek === undefined || day.dayOfWeek === null) {
        return NextResponse.json(
          { message: "dayOfWeek wajib diisi untuk setiap hari" },
          { status: 400 }
        );
      }

      const dayOfWeekNumber = Number(day.dayOfWeek);
      if (
        isNaN(dayOfWeekNumber) ||
        dayOfWeekNumber < 0 ||
        dayOfWeekNumber > 6
      ) {
        return NextResponse.json(
          {
            message: `Hari ${day.dayOfWeek} harus berupa angka antara 0 (Minggu) dan 6 (Sabtu)`,
          },
          { status: 400 }
        );
      }
    }

    // Process the schedule creation
    const errors = [];

    try {
      console.log("Fetching existing schedules for doctorId:", doctorIdNumber);

      // Periksa jadwal yang sudah ada untuk menghindari duplikasi
      const existingSchedules = await db
        .select({
          doctorId: doctorSchedules.doctorId,
          sessionId: doctorSchedules.sessionId,
          dayOfWeek: doctorSchedules.dayOfWeek,
        })
        .from(doctorSchedules)
        .where(
          and(
            eq(doctorSchedules.doctorId, doctorIdNumber),
            isNull(doctorSchedules.deletedAt)
          )
        );

      console.log("Existing schedules:", existingSchedules);

      // Buat set untuk memeriksa duplikasi dengan cepat
      const existingSet = new Set(
        existingSchedules.map(
          (s) => `${s.doctorId}-${s.sessionId}-${s.dayOfWeek}`
        )
      );

      // Kumpulkan semua jadwal yang perlu dibuat
      const schedulesToCreate = [];

      // Untuk setiap kombinasi sesi dan hari
      for (const sessionIdRaw of sessions) {
        // Ensure sessionId is a number
        const sessionId = Number(sessionIdRaw);
        if (isNaN(sessionId)) {
          errors.push({
            sessionId: sessionIdRaw,
            message: `Session ID ${sessionIdRaw} harus berupa angka`,
          });
          continue;
        }

        for (const day of days) {
          const dayOfWeek = Number(day.dayOfWeek);
          let maxPatients = defaultMaxPatients;

          // Handle maxPatients if present
          if (day.maxPatients !== undefined) {
            maxPatients = Number(day.maxPatients);
            if (isNaN(maxPatients) || maxPatients <= 0) {
              errors.push({
                sessionId,
                dayOfWeek,
                message: `Kapasitas pasien untuk hari ${dayOfWeek} harus berupa angka positif`,
              });
              continue;
            }
          }

          // Periksa duplikasi
          const key = `${doctorIdNumber}-${sessionId}-${dayOfWeek}`;

          if (existingSet.has(key)) {
            errors.push({
              sessionId,
              dayOfWeek,
              message: `Jadwal untuk dokter, sesi ${sessionId}, dan hari ${dayOfWeek} sudah ada`,
            });
            continue;
          }

          // Tambahkan ke daftar yang akan dibuat
          schedulesToCreate.push({
            doctorId: doctorIdNumber,
            sessionId,
            dayOfWeek,
            maxPatients,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      console.log("Schedules to create:", schedulesToCreate);

      // Jika tidak ada jadwal yang dapat dibuat
      if (schedulesToCreate.length === 0) {
        return NextResponse.json(
          {
            message: "Tidak ada jadwal baru yang dapat dibuat",
            errors,
          },
          { status: 409 }
        );
      }

      // Alternative approach without using transaction
      const newSchedules = [];

      try {
        // Process each schedule individually instead of using a transaction
        for (const schedule of schedulesToCreate) {
          try {
            const [newSchedule] = await db
              .insert(doctorSchedules)
              .values(schedule)
              .returning();

            newSchedules.push(newSchedule);
          } catch (insertError) {
            console.error(
              "Error inserting schedule:",
              insertError,
              "Schedule data:",
              schedule
            );
            errors.push({
              sessionId: schedule.sessionId,
              dayOfWeek: schedule.dayOfWeek,
              message: `Gagal menyimpan jadwal: ${
                insertError || "Unknown error"
              }`,
            });
          }
        }
      } catch (dbBatchError) {
        console.error("Database batch operation error:", dbBatchError);
        return NextResponse.json(
          {
            message: "Operasi database gagal",
            error: dbBatchError || "Unknown database error",
            details: JSON.stringify(dbBatchError),
          },
          { status: 500 }
        );
      }

      console.log(
        "New schedules created:",
        newSchedules.length,
        "Failed:",
        errors.length
      );

      if (newSchedules.length === 0) {
        return NextResponse.json(
          {
            message: "Gagal membuat jadwal baru",
            errors,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message: `${newSchedules.length} jadwal berhasil dibuat`,
          schedules: newSchedules,
          errors: errors.length > 0 ? errors : undefined,
        },
        { status: 201 }
      );
    } catch (dbError) {
      console.error("Database error details:", dbError);
      return NextResponse.json(
        {
          message: "Terjadi kesalahan saat menyimpan jadwal",
          error: dbError || "Unknown database error",
          details: JSON.stringify(dbError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating doctor schedules:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error || "Unknown error",
        details: JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
