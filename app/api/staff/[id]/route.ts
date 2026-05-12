// app/api/staff/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  doctorDetails,
  nurseDetails,
  receptionistDetails,
  pharmacistDetails,
} from "@/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import bcrypt from "bcrypt";
import { isValidEmail, normalizeEmail } from "@/lib/utils/email";

// GET - Get single staff member by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params; // 2. Await promise
    const staffId = parseInt(resolvedParams.id); // 3. Akses ID dari resolved params

    const [staff] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(and(eq(users.id, staffId), isNull(users.deletedAt)))
      .limit(1);

    if (!staff) {
      return NextResponse.json(
        { message: "Staff tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get role-specific details
    let details = null;
    switch (staff.role) {
      case "Doctor":
        details = await db.query.doctorDetails.findFirst({
          where: eq(doctorDetails.userId, staffId),
        });
        break;
      case "Nurse":
        details = await db.query.nurseDetails.findFirst({
          where: eq(nurseDetails.userId, staffId),
        });
        break;
      case "Receptionist":
        details = await db.query.receptionistDetails.findFirst({
          where: eq(receptionistDetails.userId, staffId),
        });
        break;
      case "Pharmacist":
        details = await db.query.pharmacistDetails.findFirst({
          where: eq(pharmacistDetails.userId, staffId),
        });
        break;
    }

    return NextResponse.json({
      ...staff,
      details,
    });
  } catch (error) {
    console.error("Error fetching staff member:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update staff member
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params; // 2. Await promise
    const staffId = parseInt(resolvedParams.id); // 3. Akses ID dari resolved params

    const body = await req.json();
    const { name, phone, specialization, password } = body;
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";

    // Get existing user
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.id, staffId), isNull(users.deletedAt)),
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "Staff tidak ditemukan" },
        { status: 404 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { message: "Email wajib diisi" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "Format email tidak valid" },
        { status: 400 }
      );
    }

    const duplicateUser = await db.query.users.findFirst({
      where: and(eq(users.email, email), ne(users.id, staffId), isNull(users.deletedAt)),
    });

    if (duplicateUser) {
      return NextResponse.json(
        { message: "Email sudah digunakan" },
        { status: 409 }
      );
    }

    const userUpdateData: {
      email: string;
      updatedAt: Date;
      password?: string;
    } = {
      email,
      updatedAt: new Date(),
    };

    if (password) {
      userUpdateData.password = await bcrypt.hash(password, 10);
    }

    await db.transaction(async (tx) => {
      await tx.update(users).set(userUpdateData).where(eq(users.id, staffId));

      switch (existingUser.role) {
        case "Doctor":
          await tx
            .update(doctorDetails)
            .set({ name, email, phone, specialization })
            .where(eq(doctorDetails.userId, staffId));
          break;
        case "Nurse":
          await tx
            .update(nurseDetails)
            .set({ name, email, phone })
            .where(eq(nurseDetails.userId, staffId));
          break;
        case "Receptionist":
          await tx
            .update(receptionistDetails)
            .set({ name, email, phone })
            .where(eq(receptionistDetails.userId, staffId));
          break;
        case "Pharmacist":
          await tx
            .update(pharmacistDetails)
            .set({ name, email, phone })
            .where(eq(pharmacistDetails.userId, staffId));
          break;
      }
    });

    return NextResponse.json({ message: "Staff berhasil diperbarui" });
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete staff member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params; // 2. Await promise
    const staffId = parseInt(resolvedParams.id); // 3. Akses ID dari resolved params

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.id, staffId), isNull(users.deletedAt)),
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "Staff tidak ditemukan" },
        { status: 404 }
      );
    }

    // Don't allow deleting admin
    if (existingUser.role === "Admin") {
      return NextResponse.json(
        { message: "Admin tidak dapat dihapus" },
        { status: 400 }
      );
    }

    // Soft delete user
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, staffId));

    return NextResponse.json({ message: "Staff berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting staff:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
