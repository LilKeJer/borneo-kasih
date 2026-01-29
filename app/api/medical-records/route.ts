// app/api/medical-records/full/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  medicalHistories,
  prescriptions,
  prescriptionMedicines,
  reservations,
  medicalHistoryServices,
  medicines, // Untuk mendapatkan nama obat saat validasi stok
  medicineStocks, // Untuk validasi stok
  serviceCatalog,
} from "@/db/schema";
import {
  fullMedicalRecordSchema,
  type PrescriptionItemFormValues, // Menggunakan tipe dari validasi
} from "@/lib/validations/medical-record"; // Sesuaikan path
import { eq, and, gte, isNull, sql, desc, inArray } from "drizzle-orm";
// import { encryptData, generateEncryptionKey } from "@/lib/utils/encryption"; // Jika enkripsi dilakukan di backend

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "Doctor") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const doctorId = parseInt(session.user.id);
    const body = await req.json();

    const validationResult = fullMedicalRecordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Data tidak valid",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const {
      patientId,
      reservationId,
      condition,
      description,
      treatment,
      doctorNotes,
      encryptionIvDoctor,

      services: serviceItems,
      prescriptions: prescriptionItems, // Array of PrescriptionItemFormValues
    } = validationResult.data;

    const reservationIdValue =
      reservationId === undefined || reservationId === null
        ? null
        : Number.parseInt(String(reservationId), 10);

    if (reservationIdValue !== null && Number.isNaN(reservationIdValue)) {
      return NextResponse.json(
        { message: "reservationId harus berupa angka" },
        { status: 400 }
      );
    }

    let newPrescriptionId: number | undefined = undefined;
    let medicalRecordId: number;

    const existingRecord =
      reservationIdValue === null
        ? null
        : await db.query.medicalHistories.findFirst({
            where: and(
              eq(medicalHistories.reservationId, reservationIdValue),
              isNull(medicalHistories.deletedAt)
            ),
            orderBy: [desc(medicalHistories.updatedAt)],
          });

    // 1. Simpan atau perbarui Medical History
    if (existingRecord) {
      await db
        .update(medicalHistories)
        .set({
          doctorId: doctorId,
          dateOfDiagnosis: new Date().toISOString().split("T")[0],
          encryptedCondition: condition,
          encryptedDescription: description,
          encryptedTreatment: treatment,
          encryptedDoctorNotes: doctorNotes || null,
          encryptionIvDoctor: encryptionIvDoctor ?? null,
          updatedAt: new Date(),
        })
        .where(eq(medicalHistories.id, existingRecord.id));

      medicalRecordId = existingRecord.id;
    } else {
      const [newMedicalRecord] = await db
        .insert(medicalHistories)
        .values({
          patientId: parseInt(patientId),
          reservationId: reservationIdValue,
          doctorId: doctorId,
          nurseId: doctorId, // Fallback untuk memenuhi NOT NULL
          encryptedNurseNotes: null,
          encryptionIvNurse: null,
          nurseCheckupTimestamp: null,
          dateOfDiagnosis: new Date().toISOString().split("T")[0],
          encryptedCondition: condition,
          encryptedDescription: description,
          encryptedTreatment: treatment,
          encryptedDoctorNotes: doctorNotes || null,
          encryptionIvDoctor: encryptionIvDoctor ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: medicalHistories.id });

      medicalRecordId = newMedicalRecord.id;
    }

    const normalizedServices = (serviceItems ?? []).map((service) => {
      const serviceId = Number.parseInt(service.serviceId, 10);
      if (Number.isNaN(serviceId)) {
        throw new Error("Layanan tidak valid");
      }
      return {
        serviceId,
        quantity: service.quantity,
        notes: service.notes || null,
      };
    });

    if (normalizedServices.length > 0) {
      const uniqueServiceIds = Array.from(
        new Set(normalizedServices.map((service) => service.serviceId))
      );
      const validServices = await db
        .select({ id: serviceCatalog.id })
        .from(serviceCatalog)
        .where(
          and(
            inArray(serviceCatalog.id, uniqueServiceIds),
            eq(serviceCatalog.isActive, true),
            isNull(serviceCatalog.deletedAt)
          )
        );

      if (validServices.length !== uniqueServiceIds.length) {
        throw new Error("Ada layanan yang tidak tersedia");
      }
    }

    await db
      .update(medicalHistoryServices)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(medicalHistoryServices.medicalHistoryId, medicalRecordId),
          isNull(medicalHistoryServices.deletedAt)
        )
      );

    if (normalizedServices.length > 0) {
      await db.insert(medicalHistoryServices).values(
        normalizedServices.map((service) => ({
          medicalHistoryId: medicalRecordId,
          serviceId: service.serviceId,
          quantity: service.quantity,
          notes: service.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    // 2. Proses Resep jika ada
    if (prescriptionItems && prescriptionItems.length > 0) {
      // Validasi Stok Obat sebelum membuat entri resep
      for (const item of prescriptionItems) {
        const medicineIdNum = parseInt(item.medicineId);
        const requiredQuantity = item.quantity;

        // Ambil total stok yang tersedia untuk obat ini dari semua batch yang belum kadaluarsa
        const totalAvailableStockResult = await db
          .select({
            total: sql<number>`SUM(${medicineStocks.remainingQuantity})`,
          })
          .from(medicineStocks)
          .where(
            and(
              eq(medicineStocks.medicineId, medicineIdNum),
              gte(medicineStocks.remainingQuantity, 0), // Stok harus ada
              // Anda bisa tambahkan filter expiryDate di sini jika perlu
              // gte(medicineStocks.expiryDate, new Date().toISOString().split('T')[0]),
              isNull(medicineStocks.deletedAt)
            )
          );

        const totalAvailableStock =
          Number(totalAvailableStockResult[0]?.total) || 0;

        if (totalAvailableStock < requiredQuantity) {
          const medicineInfo = await db
            .select({ name: medicines.name })
            .from(medicines)
            .where(eq(medicines.id, medicineIdNum))
            .limit(1);
          const medicineName =
            medicineInfo.length > 0
              ? medicineInfo[0].name
              : `Obat ID ${medicineIdNum}`;
          // Jika menggunakan transaksi, di sini Anda akan melakukan tx.rollback()
          return NextResponse.json(
            {
              message: `Stok untuk ${medicineName} tidak mencukupi (tersisa: ${totalAvailableStock}, dibutuhkan: ${requiredQuantity})`,
            },
            { status: 400 }
          );
        }
      }

      // Jika semua stok valid, buat entri resep
      const [createdPrescription] = await db
        .insert(prescriptions)
        .values({
          medicalHistoryId: medicalRecordId,
          paymentStatus: "Unpaid",
          dispenseStatus: "Pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: prescriptions.id });
      newPrescriptionId = createdPrescription.id;

      const prescriptionMedicineValues = await Promise.all(
        prescriptionItems.map(async (item: PrescriptionItemFormValues) => {
          // Logika pemilihan stockId (batch) yang lebih canggih (misal FEFO/FIFO) bisa ditambahkan di sini.
          // Untuk MVP, kita bisa ambil batch pertama yang stoknya mencukupi dan belum kadaluarsa.
          // Ini adalah penyederhanaan dan perlu di-review untuk kasus produksi.
          const suitableStock = await db
            .select({
              id: medicineStocks.id,
              remainingQuantity: medicineStocks.remainingQuantity,
            })
            .from(medicineStocks)
            .where(
              and(
                eq(medicineStocks.medicineId, parseInt(item.medicineId)),
                gte(medicineStocks.remainingQuantity, item.quantity),
                // gte(medicineStocks.expiryDate, new Date().toISOString().split('T')[0]), // Opsional: pastikan belum expired
                isNull(medicineStocks.deletedAt)
              )
            )
            .orderBy(medicineStocks.expiryDate) // Prioritaskan yang lebih dulu kadaluarsa (FEFO)
            .limit(1);

          if (suitableStock.length === 0) {
            // Ini seharusnya tidak terjadi jika validasi stok di atas berhasil, tapi sebagai fallback.
            const medicineInfo = await db
              .select({ name: medicines.name })
              .from(medicines)
              .where(eq(medicines.id, parseInt(item.medicineId)))
              .limit(1);
            const medicineName =
              medicineInfo.length > 0
                ? medicineInfo[0].name
                : `Obat ID ${item.medicineId}`;
            throw new Error(
              `Tidak ditemukan batch stok yang sesuai untuk ${medicineName} setelah validasi awal.`
            );
          }

          return {
            prescriptionId: newPrescriptionId!,
            medicineId: parseInt(item.medicineId),
            stockId: suitableStock[0].id, // Gunakan ID batch yang terpilih
            encryptedDosage: item.dosage, // ciphertext dari client
            encryptedFrequency: item.frequency, // ciphertext dari client
            encryptedDuration: item.duration, // ciphertext dari client
            encryptionIv: item.encryptionIv ?? null,
            quantityUsed: item.quantity,
            notes: item.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        })
      );
      await db.insert(prescriptionMedicines).values(prescriptionMedicineValues);
    }

    // 4. Update status reservasi jika ada reservationId
    if (reservationIdValue !== null) {
      const reservation = await db.query.reservations.findFirst({
        where: and(
          eq(reservations.id, reservationIdValue),
          isNull(reservations.deletedAt)
        ),
      });

      if (reservation && reservation.examinationStatus !== "Completed") {
        await db
          .update(reservations)
          .set({
            status: "Confirmed",
            examinationStatus: "Waiting for Payment",
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationIdValue));
      }
    }

    return NextResponse.json(
      {
        message:
          "Rekam medis berhasil disimpan" +
          (newPrescriptionId ? " beserta resep." : "."),
        medicalRecordId: medicalRecordId,
        prescriptionId: newPrescriptionId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating full medical record:", error);
    return NextResponse.json(
      {
        message: "Gagal menyimpan rekam medis",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
