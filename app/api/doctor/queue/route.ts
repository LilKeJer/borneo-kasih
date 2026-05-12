// app/api/doctor/queue/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reservations, patientDetails, medicalHistories } from "@/db/schema";
import {
  eq,
  and,
  isNull,
  gte,
  lt,
  sql,
  desc,
  isNotNull,
} from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Doctor") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const doctorId = parseInt(session.user.id);

    // Ambil tanggal hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Hitung akhir hari (hari berikutnya)
    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    // Ambil pasien yang sedang diperiksa (In Progress)
    const currentPatient = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        patientName: patientDetails.name,
        queueNumber: reservations.queueNumber,
        reservationDate: reservations.reservationDate,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
        isPriority: reservations.isPriority,
        priorityReason: reservations.priorityReason,
        // Tambahan informasi dari reservasi (jika ada)
        complaint: reservations.complaint,
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
          lt(reservations.reservationDate, nextDay),
          eq(reservations.examinationStatus, "In Progress"),
          isNull(reservations.deletedAt)
        )
      )
      .limit(1);

    // Ambil pasien yang sedang menunggu (Waiting)
    const waitingPatients = await db
      .select({
        id: reservations.id,
        patientId: reservations.patientId,
        patientName: patientDetails.name,
        queueNumber: reservations.queueNumber,
        reservationDate: reservations.reservationDate,
        status: reservations.status,
        examinationStatus: reservations.examinationStatus,
        isPriority: reservations.isPriority,
        priorityReason: reservations.priorityReason,
        checkedInAt: sql<string>`CASE WHEN ${reservations.examinationStatus} = 'Waiting' THEN ${reservations.updatedAt}::text ELSE NULL END`,
        complaint: reservations.complaint,
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
          lt(reservations.reservationDate, nextDay),
          eq(reservations.examinationStatus, "Waiting"),
          isNull(reservations.deletedAt)
        )
      )
      .orderBy(
        desc(reservations.isPriority),
        reservations.queueNumber,
        reservations.reservationDate
      );

    // Untuk setiap pasien, tambahkan tanggal kunjungan terakhir
    const patientsWithLastVisit = await Promise.all(
      [
        ...(currentPatient.length > 0 ? [currentPatient[0]] : []),
        ...waitingPatients,
      ].map(async (patient) => {
        // Cari kunjungan terakhir pasien ini
        const lastVisit = await db
          .select({
            id: medicalHistories.id,
            reservationId: medicalHistories.reservationId,
            dateOfDiagnosis: medicalHistories.dateOfDiagnosis,
            createdAt: medicalHistories.createdAt,
          })
          .from(medicalHistories)
          .where(
            and(
              eq(medicalHistories.patientId, patient.patientId),
              isNotNull(medicalHistories.encryptedCondition),
              isNull(medicalHistories.deletedAt)
            )
          )
          .orderBy(desc(medicalHistories.createdAt))
          .limit(1);

        const currentReservationRecord = await db
          .select({
            id: medicalHistories.id,
          })
          .from(medicalHistories)
          .where(
            and(
              eq(medicalHistories.reservationId, patient.id),
              isNotNull(medicalHistories.encryptedCondition),
              isNull(medicalHistories.deletedAt)
            )
          )
          .orderBy(desc(medicalHistories.updatedAt))
          .limit(1);

        return {
          ...patient,
          lastVisitDate:
            lastVisit.length > 0
              ? lastVisit[0].dateOfDiagnosis || lastVisit[0].createdAt
              : null,
          hasMedicalRecord: currentReservationRecord.length > 0,
          medicalRecordId: currentReservationRecord[0]?.id ?? null,
        };
      })
    );

    return NextResponse.json({
      currentPatient:
        patientsWithLastVisit.find(
          (p) => p.examinationStatus === "In Progress"
        ) || null,
      waitingPatients: patientsWithLastVisit.filter(
        (p) => p.examinationStatus === "Waiting"
      ),
    });
  } catch (error) {
    console.error("Error fetching doctor queue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
