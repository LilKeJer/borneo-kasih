// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Untuk MVP, kita simpan di memory dulu
// Nanti bisa dipindah ke database
let clinicSettings = {
  clinicName: "Klinik Borneo Kasih",
  address: "Jl. Klinik No. 123, Banjarmasin",
  phone: "0541-123456",
  email: "info@borneokasih.com",
  morningStart: "08:00",
  morningEnd: "12:00",
  eveningStart: "17:00",
  eveningEnd: "21:00",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(clinicSettings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validasi input
    if (!body.clinicName || !body.address || !body.phone || !body.email) {
      return NextResponse.json(
        { message: "All clinic information fields are required" },
        { status: 400 }
      );
    }

    // Update settings
    clinicSettings = {
      ...clinicSettings,
      ...body,
    };

    return NextResponse.json({
      message: "Settings updated successfully",
      data: clinicSettings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
