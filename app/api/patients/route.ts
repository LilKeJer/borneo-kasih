// app/api/patients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, patientDetails } from "@/db/schema";
import { eq, and, isNull, like, or } from "drizzle-orm";

// GET - List all patients with search and filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin", "Doctor", "Nurse"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Build base conditions
    const baseConditions = [eq(users.role, "Patient"), isNull(users.deletedAt)];

    // Add search condition if exists
    const searchConditions = [];
    if (search) {
      searchConditions.push(
        or(
          like(patientDetails.name, `%${search}%`),
          like(patientDetails.nik, `%${search}%`),
          like(patientDetails.email, `%${search}%`),
          like(users.username, `%${search}%`)
        )
      );
    }

    // Combine all conditions
    const whereClause = and(
      ...baseConditions,
      ...(searchConditions.length > 0 ? searchConditions : [])
    );

    // Main query
    const patientsQuery = db
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
      .where(whereClause);

    // Count query
    const totalCountQuery = db
      .select({ count: users.id })
      .from(users)
      .leftJoin(patientDetails, eq(users.id, patientDetails.userId))
      .where(whereClause);

    // Execute queries
    const [patients, totalResult] = await Promise.all([
      patientsQuery.limit(limit).offset(offset),
      totalCountQuery,
    ]);

    // Add status field
    const patientsWithStatus = patients.map((patient) => ({
      ...patient,
      status: "Verified",
    }));

    return NextResponse.json({
      data: patientsWithStatus,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.count || 0,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
