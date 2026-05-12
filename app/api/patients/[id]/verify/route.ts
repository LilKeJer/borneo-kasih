// app/api/patients/[id]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, patientDetails } from "@/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { isValidEmail, normalizeEmail } from "@/lib/utils/email";

// PUT - Approve/Reject patient
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { action, completeData } = body; // action: "approve" or "reject"

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
        { message: "Pasien tidak ditemukan" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      const nextEmail =
        typeof completeData?.email === "string" && completeData.email.trim()
          ? normalizeEmail(completeData.email)
          : existingPatient.email;

      if (!nextEmail) {
        return NextResponse.json(
          { message: "Email pasien wajib tersedia sebelum verifikasi" },
          { status: 400 }
        );
      }

      if (!isValidEmail(nextEmail)) {
        return NextResponse.json(
          { message: "Format email pasien tidak valid" },
          { status: 400 }
        );
      }

      const duplicateUser = await db.query.users.findFirst({
        where: and(eq(users.email, nextEmail), ne(users.id, patientId), isNull(users.deletedAt)),
      });

      if (duplicateUser) {
        return NextResponse.json(
          { message: "Email sudah digunakan oleh akun lain" },
          { status: 409 }
        );
      }

      await db.transaction(async (tx) => {
        if (completeData) {
          await tx
            .update(patientDetails)
            .set({
              email: nextEmail,
              phone: completeData.phone,
              address: completeData.address,
            })
            .where(eq(patientDetails.userId, patientId));
        }

        await tx
          .update(users)
          .set({
            email: nextEmail,
            status: "Verified",
            verifiedAt: new Date(),
            verifiedBy: parseInt(session.user.id),
            updatedAt: new Date(),
          })
          .where(eq(users.id, patientId));
      });

      return NextResponse.json({
        message: "Pasien berhasil disetujui",
        status: "Verified",
      });
    } else if (action === "reject") {
      // For MVP, rejection means soft deleting the user
      await db
        .update(users)
        .set({
          status: "Rejected",
          deletedAt: new Date(),
        })
        .where(eq(users.id, patientId));

      return NextResponse.json({
        message: "Pasien ditolak dan arsip akun disembunyikan",
        status: "Rejected",
      });
    } else {
      return NextResponse.json(
        { message: "Aksi tidak valid. Gunakan 'approve' atau 'reject'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying patient:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
