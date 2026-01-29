// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, reservations } from "@/db/schema";
import { gte, sql, and, isNull, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get total users
    const totalUsers = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(isNull(users.deletedAt));

    // Get patients today (yang ada reservasi hari ini)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const patientsToday = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${reservations.patientId})` })
      .from(reservations)
      .where(
        and(
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          inArray(reservations.status, ["Pending", "Confirmed", "Completed"])
        )
      );

    // Get active queues (status 'Confirmed' or 'In Progress')
    const activeQueues = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(
        and(
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          inArray(reservations.examinationStatus, ["Waiting", "In Progress"])
        )
      );

    return NextResponse.json({
      totalUsers: totalUsers[0]?.count || 0,
      patientsToday: patientsToday[0]?.count || 0,
      activeQueues: activeQueues[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
