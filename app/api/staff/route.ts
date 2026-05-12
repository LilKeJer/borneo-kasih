// app/api/staff/route.ts
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
import { eq, and, isNull, or, count } from "drizzle-orm";
import bcrypt from "bcrypt";
import { isValidEmail, normalizeEmail } from "@/lib/utils/email";

// GET - List all staff with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    // Filter by role if provided
    if (role) {
      conditions.push(eq(users.role, role));
    } else {
      // Exclude patients and admin from staff list
      conditions.push(
        or(
          eq(users.role, "Doctor"),
          eq(users.role, "Nurse"),
          eq(users.role, "Receptionist"),
          eq(users.role, "Pharmacist")
        )
      );
    }

    // Soft delete filter
    conditions.push(isNull(users.deletedAt));

    // Get staff members based on role
    const baseQuery = db
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
      .where(and(...conditions));

    // Execute query with pagination
    const staffMembers = await baseQuery.limit(limit).offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: count() })
      .from(users)
      .where(and(...conditions));

    // Get details for each staff member
    const staffWithDetails = await Promise.all(
      staffMembers.map(async (staff) => {
        let details = null;

        switch (staff.role) {
          case "Doctor":
            details = await db
              .select()
              .from(doctorDetails)
              .where(eq(doctorDetails.userId, staff.id))
              .limit(1);
            break;
          case "Nurse":
            details = await db
              .select()
              .from(nurseDetails)
              .where(eq(nurseDetails.userId, staff.id))
              .limit(1);
            break;
          case "Receptionist":
            details = await db
              .select()
              .from(receptionistDetails)
              .where(eq(receptionistDetails.userId, staff.id))
              .limit(1);
            break;
          case "Pharmacist":
            details = await db
              .select()
              .from(pharmacistDetails)
              .where(eq(pharmacistDetails.userId, staff.id))
              .limit(1);
            break;
        }

        return {
          ...staff,
          details: details?.[0] || null,
        };
      })
    );

    // Filter by search if provided
    let filteredStaff = staffWithDetails;
    if (search) {
      filteredStaff = staffWithDetails.filter((staff) => {
        const searchLower = search.toLowerCase();
        return (
          staff.email.toLowerCase().includes(searchLower) ||
          staff.details?.name?.toLowerCase().includes(searchLower) ||
          staff.details?.email?.toLowerCase().includes(searchLower)
        );
      });
    }

    return NextResponse.json({
      data: filteredStaff,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new staff member
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { password, role, name, phone, specialization } = body;
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!email || !password || !role || !name) {
      return NextResponse.json(
        { message: "Email, password, role, dan nama harus diisi" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "Format email tidak valid" },
        { status: 400 }
      );
    }

    // Validate role
    const validStaffRoles = ["Doctor", "Nurse", "Receptionist", "Pharmacist"];
    if (!validStaffRoles.includes(role)) {
      return NextResponse.json(
        { message: "Role tidak valid" },
        { status: 400 }
      );
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email sudah digunakan" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserId = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          role,
        })
        .returning({ id: users.id });

      switch (role) {
        case "Doctor":
          await tx.insert(doctorDetails).values({
            userId: newUser.id,
            name,
            email,
            phone,
            specialization,
          });
          break;
        case "Nurse":
          await tx.insert(nurseDetails).values({
            userId: newUser.id,
            name,
            email,
            phone,
          });
          break;
        case "Receptionist":
          await tx.insert(receptionistDetails).values({
            userId: newUser.id,
            name,
            email,
            phone,
          });
          break;
        case "Pharmacist":
          await tx.insert(pharmacistDetails).values({
            userId: newUser.id,
            name,
            email,
            phone,
          });
          break;
      }

      return newUser.id;
    });

    return NextResponse.json(
      { message: "Staff berhasil ditambahkan", id: newUserId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
