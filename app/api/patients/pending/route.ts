// app/api/patients/pending/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, patientDetails } from "@/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";

// GET - List pending patients only
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // For MVP, we'll simulate pending patients by checking if they have incomplete details
    const patients = await db
      .select({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt,
        name: patientDetails.name,
        nik: patientDetails.nik,
        email: patientDetails.email,
        phone: patientDetails.phone,
        dateOfBirth: patientDetails.dateOfBirth,
        address: patientDetails.address,
        gender: patientDetails.gender,
      })
      .from(users)
      .leftJoin(patientDetails, eq(users.id, patientDetails.userId))
      .where(
        and(
          eq(users.role, "Patient"),
          isNull(users.deletedAt),
          // Simulating pending status - patients without complete details
          or(
            isNull(patientDetails.email),
            isNull(patientDetails.phone),
            isNull(patientDetails.address)
          )
        )
      );

    // Add pending status
    const pendingPatients = patients.map((patient) => ({
      ...patient,
      status: "Pending",
      missingFields: [
        !patient.email && "email",
        !patient.phone && "phone",
        !patient.address && "address",
      ].filter(Boolean),
    }));

    return NextResponse.json({
      data: pendingPatients,
      total: pendingPatients.length,
    });
  } catch (error) {
    console.error("Error fetching pending patients:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
