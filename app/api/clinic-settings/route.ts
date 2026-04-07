import { NextResponse } from "next/server";
import {
  formatClinicOperatingHours,
  getOrCreateClinicSettings,
} from "@/lib/clinic-settings";

export async function GET() {
  try {
    const settings = await getOrCreateClinicSettings();

    return NextResponse.json({
      clinicName: settings.clinicName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      morningStart: settings.morningStart,
      morningEnd: settings.morningEnd,
      eveningStart: settings.eveningStart,
      eveningEnd: settings.eveningEnd,
      operatingHours: formatClinicOperatingHours(settings),
    });
  } catch (error) {
    console.error("Error fetching public clinic settings:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat informasi klinik" },
      { status: 500 }
    );
  }
}
