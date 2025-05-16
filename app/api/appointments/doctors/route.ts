// app/api/appointments/doctors/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, doctorDetails } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Mengambil daftar dokter yang aktif
    const doctors = await db
      .select({
        id: users.id,
        name: doctorDetails.name,
        specialization: doctorDetails.specialization,
      })
      .from(users)
      .leftJoin(doctorDetails, eq(users.id, doctorDetails.userId))
      .where(
        and(
          eq(users.role, "Doctor"),
          eq(users.status, "Active"),
          isNull(users.deletedAt)
        )
      )
      .orderBy(doctorDetails.name);

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
