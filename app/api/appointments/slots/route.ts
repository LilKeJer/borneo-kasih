// app/api/appointments/slots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  doctorSchedules,
  dailyScheduleStatuses,
  practiceSessions,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const dateStr = searchParams.get("date");

    if (!doctorId || !dateStr) {
      return NextResponse.json(
        { message: "Dokter dan tanggal harus diisi" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    const formattedDate = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay(); // 0 = Minggu, 1 = Senin, dst.

    // Cari jadwal dokter untuk hari tersebut
    const schedules = await db
      .select({
        scheduleId: doctorSchedules.id,
        sessionId: doctorSchedules.sessionId,
        startTime: practiceSessions.startTime,
        endTime: practiceSessions.endTime,
        sessionName: practiceSessions.name,
        maxPatients: doctorSchedules.maxPatients,
      })
      .from(doctorSchedules)
      .leftJoin(
        practiceSessions,
        eq(doctorSchedules.sessionId, practiceSessions.id)
      )
      .where(
        and(
          eq(doctorSchedules.doctorId, parseInt(doctorId)),
          eq(doctorSchedules.dayOfWeek, dayOfWeek),
          eq(doctorSchedules.isActive, true)
        )
      );

    if (schedules.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Cek status jadwal harian
    const dailyStatus = await Promise.all(
      schedules.map(async (schedule) => {
        const status = await db
          .select({
            id: dailyScheduleStatuses.id,
            isActive: dailyScheduleStatuses.isActive,
            currentReservations: dailyScheduleStatuses.currentReservations,
          })
          .from(dailyScheduleStatuses)
          .where(
            and(
              eq(dailyScheduleStatuses.scheduleId, schedule.scheduleId),
              eq(dailyScheduleStatuses.date, formattedDate)
            )
          );

        return {
          ...schedule,
          dailyStatus: status[0] || null,
        };
      })
    );

    // Buat slot waktu per jam
    const availableSlots = dailyStatus
      .filter((s) => {
        // Filter jadwal yang aktif
        if (!s.dailyStatus) return true;
        if (!s.dailyStatus.isActive) return false;
        const currentReservations = s.dailyStatus.currentReservations ?? 0;
        const maxPatients = s.maxPatients ?? 30;
        return currentReservations < maxPatients;
      })
      .map((s) => {
        // Pastikan startTime dan endTime tidak null
        if (s.startTime === null || s.endTime === null) {
          return [];
        }

        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        const hourSlots = [];

        // Buat time slot dengan interval 1 jam
        const startHour = start.getHours();
        const endHour = end.getHours();

        for (let h = startHour; h < endHour; h++) {
          const slotTime = new Date(date);
          slotTime.setHours(h, 0, 0, 0);

          hourSlots.push({
            scheduleId: s.scheduleId,
            sessionId: s.sessionId,
            sessionName: s.sessionName,
            time: slotTime.toISOString(),
            available: true,
          });
        }

        return hourSlots;
      })
      .flat();

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
