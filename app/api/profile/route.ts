// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  adminDetails,
  doctorDetails,
  nurseDetails,
  receptionistDetails,
  pharmacistDetails,
  patientDetails,
} from "@/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { isValidEmail, normalizeEmail } from "@/lib/utils/email";

// GET - Get current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get user basic info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get role-specific details
    let details = null;
    switch (user.role) {
      case "Admin":
        details = await db.query.adminDetails.findFirst({
          where: eq(adminDetails.userId, userId),
        });
        break;
      case "Doctor":
        details = await db.query.doctorDetails.findFirst({
          where: eq(doctorDetails.userId, userId),
        });
        break;
      case "Nurse":
        details = await db.query.nurseDetails.findFirst({
          where: eq(nurseDetails.userId, userId),
        });
        break;
      case "Receptionist":
        details = await db.query.receptionistDetails.findFirst({
          where: eq(receptionistDetails.userId, userId),
        });
        break;
      case "Pharmacist":
        details = await db.query.pharmacistDetails.findFirst({
          where: eq(pharmacistDetails.userId, userId),
        });
        break;
      case "Patient":
        details = await db.query.patientDetails.findFirst({
          where: eq(patientDetails.userId, userId),
        });
        break;
    }

    // Return profile data
    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      ...details,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update profile data
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { name, phone, address, specialization } = body;
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : undefined;

    // Get user for role checking
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    if (user.role !== "Patient") {
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
        where: and(eq(users.email, email), ne(users.id, userId), isNull(users.deletedAt)),
      });

      if (duplicateUser) {
        return NextResponse.json(
          { message: "Email sudah digunakan" },
          { status: 409 }
        );
      }
    }

    await db.transaction(async (tx) => {
      switch (user.role) {
        case "Admin":
          await tx
            .update(adminDetails)
            .set({ name, email, phone })
            .where(eq(adminDetails.userId, userId));
          break;
        case "Doctor":
          await tx
            .update(doctorDetails)
            .set({ name, email, phone, specialization })
            .where(eq(doctorDetails.userId, userId));
          break;
        case "Nurse":
          await tx
            .update(nurseDetails)
            .set({ name, email, phone })
            .where(eq(nurseDetails.userId, userId));
          break;
        case "Receptionist":
          await tx
            .update(receptionistDetails)
            .set({ name, email, phone })
            .where(eq(receptionistDetails.userId, userId));
          break;
        case "Pharmacist":
          await tx
            .update(pharmacistDetails)
            .set({ name, email, phone })
            .where(eq(pharmacistDetails.userId, userId));
          break;
        case "Patient":
          await tx
            .update(patientDetails)
            .set({ phone, address })
            .where(eq(patientDetails.userId, userId));
          break;
      }

      await tx
        .update(users)
        .set({
          email: email ?? user.email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    });

    return NextResponse.json({ message: "Profile berhasil diperbarui" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
