// app/api/doctor/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  reservations,
  patientDetails,
  medicalHistories,
  prescriptions,
} from "@/db/schema";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Doctor") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const doctorId = Number(session.user.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const now = new Date();

    const totalPatientsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(
        and(
          eq(reservations.doctorId, doctorId),
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          inArray(reservations.status, ["Pending", "Confirmed", "Completed"])
        )
      );

    const patientsSeenResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(
        and(
          eq(reservations.doctorId, doctorId),
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          inArray(reservations.examinationStatus, [
            "Completed",
            "Waiting for Payment",
          ])
        )
      );

    const currentQueue = await db
      .select({
        id: reservations.id,
        queueNumber: reservations.queueNumber,
        examinationStatus: reservations.examinationStatus,
        updatedAt: reservations.updatedAt,
        patientName: patientDetails.name,
      })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .where(
        and(
          eq(reservations.doctorId, doctorId),
          gte(reservations.reservationDate, today),
          sql`${reservations.reservationDate} < ${tomorrow}`,
          isNull(reservations.deletedAt),
          inArray(reservations.status, ["Pending", "Confirmed", "Completed"]),
          inArray(reservations.examinationStatus, ["In Progress", "Waiting"])
        )
      )
      .orderBy(
        sql`CASE WHEN ${reservations.examinationStatus} = 'In Progress' THEN 0 ELSE 1 END`,
        reservations.queueNumber
      )
      .limit(1);

    const nextAppointment = await db
      .select({
        id: reservations.id,
        reservationDate: reservations.reservationDate,
        complaint: reservations.complaint,
        patientName: patientDetails.name,
      })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .where(
        and(
          eq(reservations.doctorId, doctorId),
          gte(reservations.reservationDate, now),
          isNull(reservations.deletedAt),
          inArray(reservations.status, ["Pending", "Confirmed"])
        )
      )
      .orderBy(reservations.reservationDate)
      .limit(1);

    const upcomingAppointments = await db
      .select({
        id: reservations.id,
        reservationDate: reservations.reservationDate,
        complaint: reservations.complaint,
        patientName: patientDetails.name,
      })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .where(
        and(
          eq(reservations.doctorId, doctorId),
          gte(reservations.reservationDate, now),
          isNull(reservations.deletedAt),
          inArray(reservations.status, ["Pending", "Confirmed"])
        )
      )
      .orderBy(reservations.reservationDate)
      .limit(5);

    const prescriptionsTodayResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(prescriptions)
      .leftJoin(
        medicalHistories,
        eq(prescriptions.medicalHistoryId, medicalHistories.id)
      )
      .where(
        and(
          eq(medicalHistories.doctorId, doctorId),
          gte(prescriptions.createdAt, today),
          sql`${prescriptions.createdAt} < ${tomorrow}`,
          isNull(prescriptions.deletedAt)
        )
      );

    const readyForPickupResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(prescriptions)
      .leftJoin(
        medicalHistories,
        eq(prescriptions.medicalHistoryId, medicalHistories.id)
      )
      .where(
        and(
          eq(medicalHistories.doctorId, doctorId),
          eq(prescriptions.paymentStatus, "Paid"),
          eq(prescriptions.dispenseStatus, "Pending"),
          isNull(prescriptions.deletedAt)
        )
      );

    const recentReservations = await db
      .select({
        id: reservations.id,
        patientName: patientDetails.name,
        examinationStatus: reservations.examinationStatus,
        status: reservations.status,
        updatedAt: reservations.updatedAt,
      })
      .from(reservations)
      .leftJoin(
        patientDetails,
        eq(reservations.patientId, patientDetails.userId)
      )
      .where(
        and(eq(reservations.doctorId, doctorId), isNull(reservations.deletedAt))
      )
      .orderBy(desc(reservations.updatedAt))
      .limit(5);

    const recentActivities = recentReservations.map((item) => {
      let title = "Status antrian diperbarui";
      if (item.examinationStatus === "In Progress") {
        title = "Pemeriksaan dimulai";
      } else if (item.examinationStatus === "Completed") {
        title = "Pemeriksaan selesai";
      }

      return {
        id: `res-${item.id}`,
        title,
        description: `${item.patientName || "Pasien"} • ${
          item.examinationStatus || item.status
        }`,
        timestamp: item.updatedAt
          ? item.updatedAt.toISOString()
          : new Date().toISOString(),
        type: "appointment" as const,
      };
    });

    const totalPatients = Number(totalPatientsResult[0]?.count || 0);
    const patientsSeen = Number(patientsSeenResult[0]?.count || 0);

    return NextResponse.json({
      stats: {
        totalPatients,
        patientsSeen,
        patientsRemaining: Math.max(totalPatients - patientsSeen, 0),
        prescriptionsToday: Number(prescriptionsTodayResult[0]?.count || 0),
        readyForPickup: Number(readyForPickupResult[0]?.count || 0),
      },
      currentQueue: currentQueue[0]
        ? {
            id: currentQueue[0].id,
            patientName: currentQueue[0].patientName || "Pasien",
            queueNumber: currentQueue[0].queueNumber,
            examinationStatus: currentQueue[0].examinationStatus,
            updatedAt: currentQueue[0].updatedAt,
          }
        : null,
      nextAppointment: nextAppointment[0]
        ? {
            id: nextAppointment[0].id,
            reservationDate: nextAppointment[0].reservationDate,
            patientName: nextAppointment[0].patientName || "Pasien",
            complaint: nextAppointment[0].complaint || null,
          }
        : null,
      upcomingAppointments: upcomingAppointments.map((item) => ({
        id: item.id,
        reservationDate: item.reservationDate,
        patientName: item.patientName || "Pasien",
        complaint: item.complaint || null,
      })),
      recentActivities,
    });
  } catch (error) {
    console.error("Error fetching doctor dashboard:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
