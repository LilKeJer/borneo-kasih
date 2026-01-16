// app/api/queue/date/route.ts (ganti nama dari today ke date)
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  reservations,
  doctorDetails,
  patientDetails,
  medicalHistories,
} from "@/db/schema";
import { eq, and, isNull, gte, lte, sql, inArray, desc } from "drizzle-orm";
interface QueueItem {
  id: number;
  patientId: number;
  patientName: string;
  queueNumber: number | null;
  reservationDate: Date;
  status: string;
  examinationStatus: string;
  checkedInAt: string | null;
  complaint?: string | null;
  isPriority?: boolean;
  priorityReason?: string | null;
  hasNurseCheckup?: boolean;
}

interface DoctorQueueGroup {
  doctorId: string;
  doctorName: string;
  queues: QueueItem[];
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["Receptionist", "Admin", "Nurse"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ambil tanggal dari query parameter, default ke hari ini jika tidak ada
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    // Parse tanggal dari parameter atau gunakan hari ini
    let selectedDate: Date;
    if (dateParam) {
      selectedDate = new Date(dateParam);
      // Validasi tanggal
      if (isNaN(selectedDate.getTime())) {
        return NextResponse.json(
          { message: "Format tanggal tidak valid" },
          { status: 400 }
        );
      }
    } else {
      selectedDate = new Date();
    }

    // Reset ke awal hari
    selectedDate.setHours(0, 0, 0, 0);

    // Hitung akhir hari (hari berikutnya)
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Mendapatkan antrian untuk tanggal yang dipilih berdasarkan dokter
    const queues = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        patientName: patientDetails.name,
        doctorId: reservations.doctorId,
        doctorName: doctorDetails.name,
        reservationDate: reservations.reservationDate,
        queueNumber: reservations.queueNumber,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
        complaint: reservations.complaint,
        isPriority: reservations.isPriority,
        priorityReason: reservations.priorityReason,
        checkedInAt: sql<
          string | null
        >`CASE WHEN ${reservations.examinationStatus} = 'Waiting' THEN ${reservations.updatedAt}::text ELSE NULL END`,
      })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .leftJoin(doctorDetails, eq(reservations.doctorId, doctorDetails.userId))
      .where(
        and(
          gte(reservations.reservationDate, selectedDate),
          lte(reservations.reservationDate, nextDay),
          sql`${reservations.status} IN ('Confirmed', 'Pending')`,
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(doctorDetails.name, reservations.queueNumber);

    const reservationIds = queues.map((queue) => queue.id);
    const nurseCheckupMap = new Map<number, boolean>();

    if (reservationIds.length > 0) {
      const nurseCheckups = await db
        .select({
          reservationId: medicalHistories.reservationId,
          updatedAt: medicalHistories.updatedAt,
        })
        .from(medicalHistories)
        .where(
          and(
            inArray(medicalHistories.reservationId, reservationIds),
            isNull(medicalHistories.deletedAt)
          )
        )
        .orderBy(desc(medicalHistories.updatedAt));

      for (const record of nurseCheckups) {
        if (record.reservationId && !nurseCheckupMap.has(record.reservationId)) {
          nurseCheckupMap.set(record.reservationId, true);
        }
      }
    }

    // Mengelompokkan antrian berdasarkan dokter
    const queuesByDoctor = queues.reduce((result, queue) => {
      const doctorId = queue.doctorId.toString();
      if (!result[doctorId]) {
        result[doctorId] = {
          doctorId,
          doctorName: queue.doctorName || "Unknown Doctor",
          queues: [],
        };
      }
      result[doctorId].queues.push({
        id: queue.id,
        patientId: queue.patientId,
        patientName: queue.patientName || "Unknown Patient",
        queueNumber: queue.queueNumber,
        reservationDate: queue.reservationDate,
        status: queue.status,
        examinationStatus: queue.examinationStatus || "Not Started",
        checkedInAt: queue.checkedInAt,
        complaint: queue.complaint ?? null,
        isPriority: queue.isPriority ?? false,
        priorityReason: queue.priorityReason ?? null,
        hasNurseCheckup: nurseCheckupMap.get(queue.id) || false,
      });
      return result;
    }, {} as Record<string, DoctorQueueGroup>);

    return NextResponse.json({
      data: Object.values(queuesByDoctor),
      selectedDate: selectedDate.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching queue data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
