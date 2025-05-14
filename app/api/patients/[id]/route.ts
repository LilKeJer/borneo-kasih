// app/api/patients/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, patientDetails } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Get single patient by ID
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
    const patientId = parseInt(resolvedParams.id);

    const patient = await db
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
          eq(users.id, patientId),
          eq(users.role, "Patient"),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (!patient[0]) {
      return NextResponse.json(
        { message: "Patient not found" },
        { status: 404 }
      );
    }

    // Determine status based on completeness of data
    const status =
      patient[0].email && patient[0].phone && patient[0].address
        ? "Verified"
        : "Pending";

    return NextResponse.json({
      ...patient[0],
      status,
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update patient data
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["Admin", "Doctor", "Nurse"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { name, email, phone, address, dateOfBirth, gender } = body;

    // Check if patient exists
    const existingPatient = await db.query.users.findFirst({
      where: and(
        eq(users.id, patientId),
        eq(users.role, "Patient"),
        isNull(users.deletedAt)
      ),
    });

    if (!existingPatient) {
      return NextResponse.json(
        { message: "Patient not found" },
        { status: 404 }
      );
    }

    // Update patient details
    await db
      .update(patientDetails)
      .set({
        name,
        email,
        phone,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
      })
      .where(eq(patientDetails.userId, patientId));

    // Update user timestamp
    await db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, patientId));

    return NextResponse.json({ message: "Patient updated successfully" });
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
