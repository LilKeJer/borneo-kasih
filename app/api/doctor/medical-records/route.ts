import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  doctorDetails,
  medicalHistories,
  patientDetails,
} from "@/db/schema";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
} from "drizzle-orm";
import { createClinicDateTime } from "@/lib/clinic-time";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Doctor") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const rawLimit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isNaN(rawLimit) ? 10 : Math.min(Math.max(rawLimit, 1), 50);
    const currentPage = Number.isNaN(page) ? 1 : Math.max(page, 1);
    const offset = (currentPage - 1) * limit;
    const search = (searchParams.get("search") || "").trim();
    const patientIdParam = searchParams.get("patientId");
    const excludeReservationIdParam = searchParams.get("excludeReservationId");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const groupByPatient = searchParams.get("groupBy") === "patient";

    const conditions = [
      isNull(medicalHistories.deletedAt),
      isNotNull(medicalHistories.encryptedCondition),
    ];

    if (patientIdParam) {
      const patientId = Number.parseInt(patientIdParam, 10);
      if (Number.isNaN(patientId)) {
        return NextResponse.json(
          { message: "patientId tidak valid" },
          { status: 400 }
        );
      }

      conditions.push(eq(medicalHistories.patientId, patientId));
    }

    if (excludeReservationIdParam) {
      const excludeReservationId = Number.parseInt(
        excludeReservationIdParam,
        10
      );

      if (Number.isNaN(excludeReservationId)) {
        return NextResponse.json(
          { message: "excludeReservationId tidak valid" },
          { status: 400 }
        );
      }

      conditions.push(
        or(
          isNull(medicalHistories.reservationId),
          ne(medicalHistories.reservationId, excludeReservationId)
        )!
      );
    }

    if (dateFromParam) {
      const dateFrom = createClinicDateTime(dateFromParam, 0, 0);
      if (Number.isNaN(dateFrom.getTime())) {
        return NextResponse.json(
          { message: "dateFrom tidak valid" },
          { status: 400 }
        );
      }

      conditions.push(gte(medicalHistories.createdAt, dateFrom));
    }

    if (dateToParam) {
      const dateTo = createClinicDateTime(dateToParam, 23, 59, 59, 999);
      if (Number.isNaN(dateTo.getTime())) {
        return NextResponse.json(
          { message: "dateTo tidak valid" },
          { status: 400 }
        );
      }

      conditions.push(lte(medicalHistories.createdAt, dateTo));
    }

    if (search) {
      conditions.push(
        or(
          ilike(patientDetails.name, `%${search}%`),
          ilike(patientDetails.nik, `%${search}%`),
          ilike(patientDetails.email, `%${search}%`),
          ilike(doctorDetails.name, `%${search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const baseRecordsQuery = db
      .select({
        id: medicalHistories.id,
        patientId: medicalHistories.patientId,
        patientName: patientDetails.name,
        doctorName: doctorDetails.name,
        diagnosis: medicalHistories.encryptedCondition,
        encryptionIvDoctor: medicalHistories.encryptionIvDoctor,
        dateOfDiagnosis: medicalHistories.dateOfDiagnosis,
        createdAt: medicalHistories.createdAt,
        reservationId: medicalHistories.reservationId,
      })
      .from(medicalHistories)
      .leftJoin(
        patientDetails,
        eq(medicalHistories.patientId, patientDetails.userId)
      )
      .leftJoin(
        doctorDetails,
        eq(medicalHistories.doctorId, doctorDetails.userId)
      )
      .where(whereClause)
      .orderBy(desc(medicalHistories.createdAt));

    if (groupByPatient && !patientIdParam) {
      const records = await baseRecordsQuery;
      const groupedMap = new Map<
        number,
        {
          patientId: number;
          patientName: string;
          latestRecordId: number;
          latestDoctorName: string;
          latestDiagnosis: string;
          latestEncryptionIvDoctor: string | null;
          latestDate: Date | string;
          totalRecords: number;
          records: Array<{
            id: number;
            doctorName: string;
            diagnosis: string;
            encryptionIvDoctor: string | null;
            date: Date | string;
            createdAt: Date | null;
            reservationId: number | null;
          }>;
        }
      >();

      for (const record of records) {
        const recordDate = record.dateOfDiagnosis || record.createdAt || new Date(0);
        const normalizedRecord = {
          id: record.id,
          doctorName: record.doctorName || "Dokter",
          diagnosis: record.diagnosis || "Pemeriksaan Umum",
          encryptionIvDoctor: record.encryptionIvDoctor || null,
          date: recordDate,
          createdAt: record.createdAt,
          reservationId: record.reservationId,
        };

        const existingGroup = groupedMap.get(record.patientId);

        if (!existingGroup) {
          groupedMap.set(record.patientId, {
            patientId: record.patientId,
            patientName: record.patientName || "Pasien",
            latestRecordId: record.id,
            latestDoctorName: record.doctorName || "Dokter",
            latestDiagnosis: record.diagnosis || "Pemeriksaan Umum",
            latestEncryptionIvDoctor: record.encryptionIvDoctor || null,
            latestDate: recordDate,
            totalRecords: 1,
            records: [normalizedRecord],
          });
          continue;
        }

        existingGroup.totalRecords += 1;
        existingGroup.records.push(normalizedRecord);
      }

      const groupedRecords = Array.from(groupedMap.values());
      const total = groupedRecords.length;
      const paginatedGroups = groupedRecords.slice(offset, offset + limit);

      return NextResponse.json({
        data: paginatedGroups,
        pagination: {
          page: currentPage,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    const totalQuery = db
      .select({ count: count() })
      .from(medicalHistories)
      .leftJoin(
        patientDetails,
        eq(medicalHistories.patientId, patientDetails.userId)
      )
      .leftJoin(
        doctorDetails,
        eq(medicalHistories.doctorId, doctorDetails.userId)
      )
      .where(whereClause);

    const recordsQuery = baseRecordsQuery.limit(limit).offset(offset);

    const [records, totalResult] = await Promise.all([recordsQuery, totalQuery]);
    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      data: records.map((record) => ({
        id: record.id,
        patientId: record.patientId,
        patientName: record.patientName || "Pasien",
        doctorName: record.doctorName || "Dokter",
        diagnosis: record.diagnosis || "Pemeriksaan Umum",
        encryptionIvDoctor: record.encryptionIvDoctor || null,
        date: record.dateOfDiagnosis || record.createdAt,
        createdAt: record.createdAt,
        reservationId: record.reservationId,
      })),
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching doctor medical records:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
