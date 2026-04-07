import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq, isNull, ne } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { patientDetails, users } from "@/db/schema";

const editableStatuses = ["Pending", "Verified", "Inactive", "Suspended"];

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

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
    const patientId = Number.parseInt(resolvedParams.id, 10);

    const patient = await db
      .select({
        id: users.id,
        username: users.username,
        status: users.status,
        createdAt: users.createdAt,
        verifiedAt: users.verifiedAt,
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
        { message: "Pasien tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(patient[0]);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

// PUT - Update patient data and status
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
    const patientId = Number.parseInt(resolvedParams.id, 10);
    const body = await req.json();

    const name = normalizeOptionalString(body.name);
    const email = normalizeOptionalString(body.email);
    const phone = normalizeOptionalString(body.phone);
    const address = normalizeOptionalString(body.address);
    const gender =
      body.gender === "L" || body.gender === "P" ? body.gender : undefined;
    const dateOfBirth =
      typeof body.dateOfBirth === "string" && body.dateOfBirth.trim()
        ? new Date(body.dateOfBirth)
        : undefined;
    const requestedStatus =
      typeof body.status === "string" ? body.status.trim() : undefined;

    if (
      requestedStatus &&
      !editableStatuses.includes(requestedStatus)
    ) {
      return NextResponse.json(
        { message: "Status pasien tidak valid" },
        { status: 400 }
      );
    }

    if (requestedStatus && session.user.role !== "Admin") {
      return NextResponse.json(
        { message: "Hanya admin yang dapat mengubah status pasien" },
        { status: 403 }
      );
    }

    const existingPatient = await db.query.users.findFirst({
      where: and(
        eq(users.id, patientId),
        eq(users.role, "Patient"),
        isNull(users.deletedAt)
      ),
      with: {
        patientDetails: true,
      },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { message: "Pasien tidak ditemukan" },
        { status: 404 }
      );
    }

    if (email) {
      const duplicateEmail = await db.query.patientDetails.findFirst({
        where: and(eq(patientDetails.email, email), ne(patientDetails.userId, patientId)),
      });

      if (duplicateEmail) {
        return NextResponse.json(
          { message: "Email sudah digunakan oleh pasien lain" },
          { status: 409 }
        );
      }
    }

    await db
      .update(patientDetails)
      .set({
        name: name ?? undefined,
        email,
        phone,
        address,
        dateOfBirth:
          dateOfBirth && !Number.isNaN(dateOfBirth.getTime())
            ? dateOfBirth
            : undefined,
        gender,
      })
      .where(eq(patientDetails.userId, patientId));

    if (requestedStatus) {
      await db
        .update(users)
        .set({
          status: requestedStatus,
          verifiedAt:
            requestedStatus === "Verified"
              ? existingPatient.verifiedAt ?? new Date()
              : existingPatient.verifiedAt,
          verifiedBy:
            requestedStatus === "Verified"
              ? Number.parseInt(session.user.id, 10)
              : existingPatient.verifiedBy,
          updatedAt: new Date(),
        })
        .where(eq(users.id, patientId));
    } else {
      await db
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, patientId));
    }

    return NextResponse.json({
      message: requestedStatus
        ? "Data dan status pasien berhasil diperbarui"
        : "Data pasien berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
