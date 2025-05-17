// app/api/queue/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Receptionist", "Admin", "Nurse", "Doctor"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const reservationId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { examinationStatus } = body;

    if (!examinationStatus) {
      return NextResponse.json(
        { message: "Status pemeriksaan diperlukan" },
        { status: 400 }
      );
    }

    // Validasi status yang diberikan
    const validStatuses = ["Waiting", "In Progress", "Completed", "Cancelled"];
    if (!validStatuses.includes(examinationStatus)) {
      return NextResponse.json(
        { message: "Status tidak valid" },
        { status: 400 }
      );
    }

    // Update status pemeriksaan
    await db
      .update(reservations)
      .set({
        examinationStatus,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, reservationId));

    return NextResponse.json({
      message: "Status antrian berhasil diperbarui",
      examinationStatus,
    });
  } catch (error) {
    console.error("Error updating queue status:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
