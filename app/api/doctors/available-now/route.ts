// app/api/doctors/available-now/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  doctorDetails,
  doctorSchedules,
  practiceSessions,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm"; // Tambahkan import sql
import {
  getClinicDateString,
  getClinicNowParts,
  isSessionActiveAt,
} from "@/lib/clinic-time";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Receptionist", "Admin", "Nurse"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const { dayOfWeek: currentDay, minutesSinceMidnight } =
      getClinicNowParts(now);
    const today = getClinicDateString(now);

    const availableDoctors = await db
      .select({
        id: users.id,
        name: doctorDetails.name,
        scheduleId: doctorSchedules.id,
        sessionId: doctorSchedules.sessionId,
        sessionName: practiceSessions.name,
        maxPatients: doctorSchedules.maxPatients,
        startTime: practiceSessions.startTime,
        endTime: practiceSessions.endTime,
      })
      .from(doctorSchedules)
      .leftJoin(users, eq(doctorSchedules.doctorId, users.id))
      .leftJoin(doctorDetails, eq(users.id, doctorDetails.userId))
      .leftJoin(
        practiceSessions,
        eq(doctorSchedules.sessionId, practiceSessions.id)
      )
      .where(
        and(
          eq(doctorSchedules.dayOfWeek, currentDay),
          eq(doctorSchedules.isActive, true),
          eq(users.status, "Active"),
          isNull(users.deletedAt)
        )
      );

    const doctorsWithCapacity = await Promise.all(
      availableDoctors.map(async (doctor) => {
        // Perbaiki query dengan sql template
        const dailyStatus = await db.execute(
          sql`SELECT id, current_reservations 
              FROM "DailyScheduleStatus" 
              WHERE schedule_id = ${doctor.scheduleId} 
                AND date = ${today} 
                AND is_active = true`
        );

        // Konversi ke number
        const currentReservations =
          Number(dailyStatus.rows[0]?.current_reservations) || 0;
        const maxPatients = doctor.maxPatients || 30;
        const remainingCapacity = maxPatients - currentReservations;
        const isCurrentSession = isSessionActiveAt({
          startTime: doctor.startTime,
          endTime: doctor.endTime,
          minutesSinceMidnight,
        });

        return {
          id: doctor.id,
          name: doctor.name,
          scheduleId: doctor.scheduleId,
          sessionName: doctor.sessionName,
          currentPatients: currentReservations,
          maxPatients: maxPatients,
          remainingCapacity: remainingCapacity,
          available: isCurrentSession && remainingCapacity > 0,
        };
      })
    );

    const availableDoctorsWithCapacity = doctorsWithCapacity.filter(
      (doctor) => doctor.available
    );

    return NextResponse.json(availableDoctorsWithCapacity);
  } catch (error) {
    console.error("Error fetching available doctors:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
