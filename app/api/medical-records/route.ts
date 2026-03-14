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
import { allocateStockByFEFO, groupRequestedMedicineQuantities } from "@/lib/fefo";
import {
  fullMedicalRecordSchema,
  type PrescriptionItemFormValues, // Menggunakan tipe dari validasi
} from "@/lib/validations/medical-record"; // Sesuaikan path
import { eq, and, isNull, sql, desc, inArray, asc, gt } from "drizzle-orm";
// import { encryptData, generateEncryptionKey } from "@/lib/utils/encryption"; // Jika enkripsi dilakukan di backend

class MedicalRecordRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "MedicalRecordRequestError";
  }
}

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
    const { medicalRecordId } = await db.transaction(async (tx) => {
      let medicalRecordId: number;

      const existingRecord =
        reservationIdValue === null
          ? null
          : await tx.query.medicalHistories.findFirst({
              where: and(
                eq(medicalHistories.reservationId, reservationIdValue),
                isNull(medicalHistories.deletedAt)
              ),
              orderBy: [desc(medicalHistories.updatedAt)],
            });

      // 1. Simpan atau perbarui Medical History
      if (existingRecord) {
        await tx
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
        const [newMedicalRecord] = await tx
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
          throw new MedicalRecordRequestError("Layanan tidak valid");
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
        const validServices = await tx
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
          throw new MedicalRecordRequestError("Ada layanan yang tidak tersedia");
        }
      }

      await tx
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
        await tx.insert(medicalHistoryServices).values(
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
        const normalizedPrescriptionItems = prescriptionItems.map(
          (item: PrescriptionItemFormValues) => {
            const medicineId = Number.parseInt(item.medicineId, 10);

            if (Number.isNaN(medicineId)) {
              throw new MedicalRecordRequestError("Obat tidak valid");
            }

            return {
              ...item,
              medicineId,
            };
          }
        );

        const requestedQuantitiesByMedicine = groupRequestedMedicineQuantities(
          normalizedPrescriptionItems.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
          }))
        );
        const requestedMedicineIds = Array.from(
          requestedQuantitiesByMedicine.keys()
        );

        const medicineInfoRows = await tx
          .select({
            id: medicines.id,
            name: medicines.name,
          })
          .from(medicines)
          .where(
            and(
              inArray(medicines.id, requestedMedicineIds),
              eq(medicines.isActive, true),
              isNull(medicines.deletedAt)
            )
          );

        const medicineInfoMap = new Map(
          medicineInfoRows.map((medicine) => [medicine.id, medicine.name])
        );

        if (medicineInfoMap.size !== requestedMedicineIds.length) {
          throw new MedicalRecordRequestError(
            "Ada obat yang tidak tersedia untuk diresepkan"
          );
        }

        const stockRows = await tx
          .select({
            id: medicineStocks.id,
            medicineId: medicineStocks.medicineId,
            remainingQuantity: medicineStocks.remainingQuantity,
            expiryDate: medicineStocks.expiryDate,
          })
          .from(medicineStocks)
          .where(
            and(
              inArray(medicineStocks.medicineId, requestedMedicineIds),
              isNull(medicineStocks.deletedAt),
              gt(medicineStocks.remainingQuantity, 0),
              gt(medicineStocks.expiryDate, sql`CURRENT_DATE`)
            )
          )
          .orderBy(asc(medicineStocks.expiryDate), asc(medicineStocks.id));

        const batchesByMedicine = new Map<
          number,
          Array<{
            id: number;
            medicineId: number;
            remainingQuantity: number;
            expiryDate: string;
          }>
        >();

        for (const stock of stockRows) {
          const existingBatches = batchesByMedicine.get(stock.medicineId) ?? [];
          existingBatches.push({
            id: stock.id,
            medicineId: stock.medicineId,
            remainingQuantity: stock.remainingQuantity,
            expiryDate: stock.expiryDate,
          });
          batchesByMedicine.set(stock.medicineId, existingBatches);
        }

        const primaryStockIdByMedicine = new Map<number, number>();

        for (const [medicineId, requiredQuantity] of requestedQuantitiesByMedicine) {
          const fefoPlan = allocateStockByFEFO(
            batchesByMedicine.get(medicineId) ?? [],
            requiredQuantity
          );
          const medicineName =
            medicineInfoMap.get(medicineId) ?? `Obat ID ${medicineId}`;

          if (
            fefoPlan.remainingRequiredQuantity > 0 ||
            fefoPlan.allocations.length === 0
          ) {
            throw new MedicalRecordRequestError(
              `Stok FEFO untuk ${medicineName} tidak mencukupi (tersedia layak pakai: ${fefoPlan.totalAvailableQuantity}, dibutuhkan: ${requiredQuantity})`
            );
          }

          primaryStockIdByMedicine.set(
            medicineId,
            fefoPlan.allocations[0].stockId
          );
        }

        // Simpan resep setelah validasi FEFO berhasil. Pengurangan stok fisik
        // tetap dilakukan saat dispense agar tidak ada potong stok sebelum obat diserahkan.
        const [createdPrescription] = await tx
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

        const prescriptionMedicineValues = normalizedPrescriptionItems.map(
          (item) => ({
            prescriptionId: newPrescriptionId!,
            medicineId: item.medicineId,
            // FEFO reference batch saat resep dibuat. Alokasi fisik final
            // dihitung ulang dengan FEFO ketika proses dispense.
            stockId: primaryStockIdByMedicine.get(item.medicineId)!,
            encryptedDosage: item.dosage,
            encryptedFrequency: item.frequency,
            encryptedDuration: item.duration,
            encryptionIv: item.encryptionIv ?? null,
            quantityUsed: item.quantity,
            notes: item.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );
        await tx.insert(prescriptionMedicines).values(prescriptionMedicineValues);
      }

      // 4. Update status reservasi jika ada reservationId
      if (reservationIdValue !== null) {
        const reservation = await tx.query.reservations.findFirst({
          where: and(
            eq(reservations.id, reservationIdValue),
            isNull(reservations.deletedAt)
          ),
        });

        if (reservation && reservation.examinationStatus !== "Completed") {
          await tx
            .update(reservations)
            .set({
              status: "Confirmed",
              examinationStatus: "Waiting for Payment",
              updatedAt: new Date(),
            })
            .where(eq(reservations.id, reservationIdValue));
        }
      }

      return { medicalRecordId };
    });

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
    if (error instanceof MedicalRecordRequestError) {
      return NextResponse.json(
        {
          message: error.message,
        },
        { status: error.status }
      );
    }

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
