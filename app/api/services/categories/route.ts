// app/api/services/categories/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Mendapatkan daftar kategori layanan
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Daftar kategori tetap
    const categories = [
      { id: "Konsultasi", name: "Konsultasi" },
      { id: "Pemeriksaan", name: "Pemeriksaan" },
      { id: "Tindakan", name: "Tindakan" },
      { id: "Lainnya", name: "Lainnya" },
    ];

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
