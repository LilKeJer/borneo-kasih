// app/api/prescriptions/[id]/dispense/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
  medicineStocks,
  medicines,
  prescriptionMedicines,
  prescriptions,
} from "@/db/schema";
import { allocateStockByFEFO, groupRequestedMedicineQuantities } from "@/lib/fefo";
import { and, asc, eq, gt, gte, inArray, isNull, sql } from "drizzle-orm";

class DispenseRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "DispenseRequestError";
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "Pharmacist") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const prescriptionId = Number.parseInt(resolvedParams.id, 10);

    if (Number.isNaN(prescriptionId)) {
      return NextResponse.json(
        { message: "ID resep tidak valid" },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [claim] = await tx
        .update(prescriptions)
        .set({
          dispenseStatus: "Dispensing",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(prescriptions.id, prescriptionId),
            eq(prescriptions.paymentStatus, "Paid"),
            eq(prescriptions.dispenseStatus, "Pending"),
            isNull(prescriptions.deletedAt)
          )
        )
        .returning({
          id: prescriptions.id,
        });

      if (!claim) {
        const existingPrescription = await tx.query.prescriptions.findFirst({
          where: and(
            eq(prescriptions.id, prescriptionId),
            isNull(prescriptions.deletedAt)
          ),
        });

        if (!existingPrescription) {
          throw new DispenseRequestError("Resep tidak ditemukan", 404);
        }

        if (existingPrescription.paymentStatus !== "Paid") {
          throw new DispenseRequestError("Pembayaran belum lunas");
        }

        if (existingPrescription.dispenseStatus === "Dispensed") {
          return {
            alreadyDispensed: true,
            data: {
              id: existingPrescription.id,
              dispenseStatus: existingPrescription.dispenseStatus,
              updatedAt: existingPrescription.updatedAt,
            },
            allocations: [],
          };
        }

        throw new DispenseRequestError(
          "Resep sedang diproses. Silakan coba lagi.",
          409
        );
      }

      const prescriptionItems = await tx
        .select({
          medicineId: prescriptionMedicines.medicineId,
          quantityUsed: prescriptionMedicines.quantityUsed,
          medicineName: medicines.name,
        })
        .from(prescriptionMedicines)
        .innerJoin(medicines, eq(prescriptionMedicines.medicineId, medicines.id))
        .where(
          and(
            eq(prescriptionMedicines.prescriptionId, prescriptionId),
            isNull(prescriptionMedicines.deletedAt),
            isNull(medicines.deletedAt)
          )
        );

      if (prescriptionItems.length === 0) {
        throw new DispenseRequestError("Resep tidak memiliki item obat");
      }

      const requestedQuantitiesByMedicine = groupRequestedMedicineQuantities(
        prescriptionItems.map((item) => ({
          medicineId: item.medicineId,
          quantity: item.quantityUsed,
        }))
      );
      const medicineIds = Array.from(requestedQuantitiesByMedicine.keys());
      const medicineNameMap = new Map(
        prescriptionItems.map((item) => [item.medicineId, item.medicineName])
      );

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
            inArray(medicineStocks.medicineId, medicineIds),
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
        const currentBatches = batchesByMedicine.get(stock.medicineId) ?? [];
        currentBatches.push({
          id: stock.id,
          medicineId: stock.medicineId,
          remainingQuantity: stock.remainingQuantity,
          expiryDate: stock.expiryDate,
        });
        batchesByMedicine.set(stock.medicineId, currentBatches);
      }

      const allocationSummary: Array<{
        medicineId: number;
        medicineName: string;
        quantity: number;
        batches: Array<{ stockId: number; quantity: number; expiryDate: string }>;
      }> = [];

      for (const [medicineId, requiredQuantity] of requestedQuantitiesByMedicine) {
        const fefoPlan = allocateStockByFEFO(
          batchesByMedicine.get(medicineId) ?? [],
          requiredQuantity
        );
        const medicineName =
          medicineNameMap.get(medicineId) ?? `Obat ID ${medicineId}`;

        if (fefoPlan.remainingRequiredQuantity > 0) {
          throw new DispenseRequestError(
            `Stok FEFO untuk ${medicineName} tidak cukup saat dispense (tersedia layak pakai: ${fefoPlan.totalAvailableQuantity}, dibutuhkan: ${requiredQuantity})`,
            409
          );
        }

        for (const allocation of fefoPlan.allocations) {
          const updatedStock = await tx
            .update(medicineStocks)
            .set({
              remainingQuantity: sql`${medicineStocks.remainingQuantity} - ${allocation.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(medicineStocks.id, allocation.stockId),
                isNull(medicineStocks.deletedAt),
                gte(medicineStocks.remainingQuantity, allocation.quantity)
              )
            )
            .returning({ id: medicineStocks.id });

          if (updatedStock.length === 0) {
            throw new DispenseRequestError(
              `Stok untuk ${medicineName} berubah saat proses dispense. Silakan coba lagi.`,
              409
            );
          }
        }

        allocationSummary.push({
          medicineId,
          medicineName,
          quantity: requiredQuantity,
          batches: fefoPlan.allocations.map((allocation) => ({
            stockId: allocation.stockId,
            quantity: allocation.quantity,
            expiryDate: String(allocation.expiryDate),
          })),
        });
      }

      const [updatedPrescription] = await tx
        .update(prescriptions)
        .set({
          dispenseStatus: "Dispensed",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(prescriptions.id, prescriptionId),
            eq(prescriptions.dispenseStatus, "Dispensing"),
            isNull(prescriptions.deletedAt)
          )
        )
        .returning({
          id: prescriptions.id,
          dispenseStatus: prescriptions.dispenseStatus,
          updatedAt: prescriptions.updatedAt,
        });

      return {
        alreadyDispensed: false,
        data: updatedPrescription,
        allocations: allocationSummary,
      };
    });

    if (result.alreadyDispensed) {
      return NextResponse.json({
        message: "Resep sudah pernah diserahkan sebelumnya",
        data: result.data,
      });
    }

    return NextResponse.json({
      message: "Resep berhasil diserahkan dan stok FEFO diperbarui",
      data: result.data,
      allocations: result.allocations,
    });
  } catch (error) {
    if (error instanceof DispenseRequestError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("Error dispensing prescription:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
