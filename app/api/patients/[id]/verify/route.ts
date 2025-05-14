// app/api/patients/[id]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, patientDetails } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

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
        { message: "Patient not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      // If completeData is provided, update patient details
      if (completeData) {
        await db
          .update(patientDetails)
          .set({
            email: completeData.email,
            phone: completeData.phone,
            address: completeData.address,
          })
          .where(eq(patientDetails.userId, patientId));
      }

      // Update user status to Verified
      await db
        .update(users)
        .set({
          status: "Verified", // <-- Update status menjadi Verified
          verifiedAt: new Date(),
          verifiedBy: parseInt(session.user.id),
          updatedAt: new Date(),
        })
        .where(eq(users.id, patientId));

      return NextResponse.json({
        message: "Patient approved successfully",
        status: "Verified",
      });
    } else if (action === "reject") {
      // For MVP, rejection means soft deleting the user
      await db
        .update(users)
        .set({
          status: "Rejected", // <-- Update status menjadi Rejected
          deletedAt: new Date(),
        })
        .where(eq(users.id, patientId));

      return NextResponse.json({
        message: "Patient rejected and removed",
        status: "Rejected",
      });
    } else {
      return NextResponse.json(
        { message: "Invalid action. Use 'approve' or 'reject'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying patient:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
