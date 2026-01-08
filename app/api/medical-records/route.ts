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
  medicines, // Untuk mendapatkan nama obat saat validasi stok
  medicineStocks, // Untuk validasi stok
  // Jika Anda memutuskan menyimpan layanan terkait medical record:
  // serviceCatalog,
  // medicalHistoryServices, // Anda perlu membuat skema ini jika mau
} from "@/db/schema";
import {
  fullMedicalRecordSchema,
  type PrescriptionItemFormValues, // Menggunakan tipe dari validasi
} from "@/lib/validations/medical-record"; // Sesuaikan path
import { eq, and, gte, isNull, sql } from "drizzle-orm";
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

      prescriptions: prescriptionItems, // Array of PrescriptionItemFormValues
    } = validationResult.data;

    let newPrescriptionId: number | undefined = undefined;
    const parsedReservationId =
      reservationId === undefined || reservationId === null
        ? null
        : Number.parseInt(String(reservationId), 10);

    if (
      reservationId !== undefined &&
      (Number.isNaN(parsedReservationId) || parsedReservationId <= 0)
    ) {
      return NextResponse.json(
        { message: "Reservation ID tidak valid" },
        { status: 400 }
      );
    }

    // 1. Simpan Medical History
    // TODO: Implementasi enkripsi yang aman untuk field di bawah ini
    // Untuk saat ini, kita simpan sebagai plaintext atau placeholder
    const [newMedicalRecord] = await db
      .insert(medicalHistories)
      .values({
        patientId: parseInt(patientId),
        doctorId: doctorId,
        nurseId: doctorId, // Asumsi dokter input langsung untuk MVP
        reservationId: parsedReservationId,
        dateOfDiagnosis: new Date().toISOString().split("T")[0],
        encryptedCondition: condition, // Placeholder enkripsi
        encryptedDescription: description, // Placeholder enkripsi
        encryptedTreatment: treatment, // Placeholder enkripsi
        encryptedDoctorNotes: doctorNotes || null, // Placeholder enkripsi
        encryptionIvDoctor: "iv_placeholder_doctor", // TODO: Generate IV yang aman
        encryptionIvNurse: "iv_placeholder_nurse", // TODO: Generate IV yang aman
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: medicalHistories.id });

    const medicalRecordId = newMedicalRecord.id;

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

          // TODO: Implementasi enkripsi yang aman untuk field di bawah ini
          const placeholderIv = `iv_placeholder_${
            item.medicineId
          }_${Date.now()}`;

          return {
            prescriptionId: newPrescriptionId!,
            medicineId: parseInt(item.medicineId),
            stockId: suitableStock[0].id, // Gunakan ID batch yang terpilih
            encryptedDosage: item.dosage, // TANPA ENKRIPSI SEMENTARA
            encryptedFrequency: item.frequency, // TANPA ENKRIPSI SEMENTARA
            encryptedDuration: item.duration, // TANPA ENKRIPSI SEMENTARA
            encryptionIv: placeholderIv,
            quantityUsed: item.quantity,
            notes: item.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        })
      );
      await db.insert(prescriptionMedicines).values(prescriptionMedicineValues);
    }

    // 3. Proses Layanan (jika ada dan ingin dicatat terpisah)
    // Untuk saat ini, kita asumsikan layanan akan ditambahkan manual di form pembayaran
    // atau layanan utama sudah implisit dari reservasi.
    // Jika ingin menyimpan layanan yang dipilih dokter terkait medical record,
    // Anda perlu tabel medicalHistoryServices dan insert di sini.

    // 4. Update status reservasi jika ada reservationId
    if (parsedReservationId) {
      await db
        .update(reservations)
        .set({
          status: "Completed",
          examinationStatus: "Completed",
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, parsedReservationId));
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
