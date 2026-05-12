import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq, isNull, ne } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { patientDetails, users } from "@/db/schema";
import { isValidEmail, normalizeEmail } from "@/lib/utils/email";

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
        status: users.status,
        createdAt: users.createdAt,
        verifiedAt: users.verifiedAt,
        name: patientDetails.name,
        nik: patientDetails.nik,
        email: users.email,
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
    const phone = normalizeOptionalString(body.phone);
    const address = normalizeOptionalString(body.address);
    const hasEmailField = Object.prototype.hasOwnProperty.call(body, "email");
    const rawEmail =
      typeof body.email === "string" ? body.email.trim() : undefined;
    const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
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

    if (hasEmailField && !rawEmail) {
      return NextResponse.json(
        { message: "Email pasien wajib diisi" },
        { status: 400 }
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { message: "Format email pasien tidak valid" },
        { status: 400 }
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
      const duplicateEmail = await db.query.users.findFirst({
        where: and(eq(users.email, email), ne(users.id, patientId), isNull(users.deletedAt)),
      });

      if (duplicateEmail) {
        return NextResponse.json(
          { message: "Email sudah digunakan oleh akun lain" },
          { status: 409 }
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx
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

      await tx
        .update(users)
        .set({
          email: email ?? existingPatient.email,
          status: requestedStatus ?? existingPatient.status,
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
    });

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
