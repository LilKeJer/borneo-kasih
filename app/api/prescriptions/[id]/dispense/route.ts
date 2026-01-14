// app/api/prescriptions/[id]/dispense/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { prescriptions } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Pharmacist") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const prescriptionId = Number.parseInt(resolvedParams.id, 10);

    if (Number.isNaN(prescriptionId)) {
      return NextResponse.json(
        { message: "ID resep tidak valid" },
        { status: 400 }
      );
    }

    const prescription = await db.query.prescriptions.findFirst({
      where: and(
        eq(prescriptions.id, prescriptionId),
        isNull(prescriptions.deletedAt)
      ),
    });

    if (!prescription) {
      return NextResponse.json(
        { message: "Resep tidak ditemukan" },
        { status: 404 }
      );
    }

    if (prescription.paymentStatus !== "Paid") {
      return NextResponse.json(
        { message: "Pembayaran belum lunas" },
        { status: 400 }
      );
    }

    if (prescription.dispenseStatus === "Dispensed") {
      return NextResponse.json(
        { message: "Resep sudah diproses" },
        { status: 400 }
      );
    }

    const [updatedPrescription] = await db
      .update(prescriptions)
      .set({
        dispenseStatus: "Dispensed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(prescriptions.id, prescriptionId),
          isNull(prescriptions.deletedAt)
        )
      )
      .returning({
        id: prescriptions.id,
        dispenseStatus: prescriptions.dispenseStatus,
        updatedAt: prescriptions.updatedAt,
      });

    return NextResponse.json({
      message: "Resep berhasil diserahkan",
      data: updatedPrescription,
    });
  } catch (error) {
    console.error("Error dispensing prescription:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
