// db/schema/pharmacy.ts
import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  integer,
  index,
  date,
  decimal,
  check,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";
import { medicalHistories } from "./medical";
import { sql } from "drizzle-orm";

// Prescription
export const prescriptions = pgTable(
  "Prescription",
  {
    id: serial("id").primaryKey(),
    medicalHistoryId: integer("medical_history_id")
      .notNull()
      .references(() => medicalHistories.id),
    paymentStatus: varchar("payment_status", { length: 20 })
      .notNull()
      .default("Unpaid"),
    dispenseStatus: varchar("dispense_status", { length: 20 })
      .notNull()
      .default("Pending"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      medicalHistoryIdx: index("idx_prescription_medical_history").on(
        table.medicalHistoryId
      ),
    };
  }
);

// Medicine dengan field tambahan
export const medicines = pgTable(
  "Medicine",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }), // Tambahan: kategori obat
    unit: varchar("unit", { length: 20 }), // Tambahan: unit (tablet, ml, botol, dll)
    pharmacistId: integer("pharmacist_id")
      .notNull()
      .references(() => users.id),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    minimumStock: integer("minimum_stock").default(10).notNull(),
    reorderThresholdPercentage: integer("reorder_threshold_percentage")
      .default(20)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(), // Tambahan: status aktif
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      nameIdx: index("idx_medicine_name").on(table.name),
      categoryIdx: index("idx_medicine_category").on(table.category), // Index untuk kategori
      pharmacistIdx: index("idx_medicine_pharmacist").on(table.pharmacistId),
      activeIdx: index("idx_medicine_active").on(table.isActive), // Index untuk filter aktif
      priceCheck: check("check_price", sql`${table.price} > 0`),
      minimumStockCheck: check(
        "check_minimum_stock",
        sql`${table.minimumStock} >= 0`
      ),
      thresholdPercentageCheck: check(
        "check_threshold_percentage",
        sql`${table.reorderThresholdPercentage} BETWEEN 0 AND 100`
      ),
    };
  }
);

// Medicine Stock dengan field tambahan
export const medicineStocks = pgTable(
  "MedicineStock",
  {
    id: serial("id").primaryKey(),
    medicineId: integer("medicine_id")
      .notNull()
      .references(() => medicines.id),
    batchNumber: varchar("batch_number", { length: 50 }).notNull(), // Wajib ada
    quantity: integer("quantity").notNull(),
    remainingQuantity: integer("remaining_quantity").notNull(),
    expiryDate: date("expiry_date").notNull(), // Wajib ada
    supplier: varchar("supplier", { length: 100 }), // Tambahan: supplier
    purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }), // Tambahan: harga beli
    addedAt: timestamp("added_at").defaultNow(),
    isBelowThreshold: boolean("is_below_threshold").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      medicineIdx: index("idx_stock_medicine").on(table.medicineId),
      batchNumberIdx: index("idx_stock_batch").on(table.batchNumber),
      expiryDateIdx: index("idx_stock_expiry").on(table.expiryDate),
      remainingQtyIdx: index("idx_stock_remaining").on(table.remainingQuantity),
      supplierIdx: index("idx_stock_supplier").on(table.supplier),
      quantityCheck: check("check_quantity", sql`${table.quantity} >= 0`),
      remainingQuantityCheck: check(
        "check_remaining_quantity",
        sql`${table.remainingQuantity} >= 0`
      ),
    };
  }
);

// Prescription Medicine
export const prescriptionMedicines = pgTable(
  "PrescriptionMedicine",
  {
    id: serial("id").primaryKey(),
    prescriptionId: integer("prescription_id")
      .notNull()
      .references(() => prescriptions.id),
    medicineId: integer("medicine_id")
      .notNull()
      .references(() => medicines.id),
    stockId: integer("stock_id")
      .notNull()
      .references(() => medicineStocks.id),

    // Data terenkripsi untuk resep
    encryptedDosage: text("encrypted_dosage"),
    encryptedFrequency: text("encrypted_frequency"),
    encryptedDuration: text("encrypted_duration"),
    encryptionIv: text("encryption_iv"),

    quantityUsed: integer("quantity_used").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      prescriptionIdx: index("idx_prescription_medicine_prescription").on(
        table.prescriptionId
      ),
      medicineIdx: index("idx_prescription_medicine_medicine").on(
        table.medicineId
      ),
      quantityUsedCheck: check(
        "check_quantity_used",
        sql`${table.quantityUsed} > 0`
      ),
    };
  }
);

// Relations
export const prescriptionsRelations = relations(
  prescriptions,
  ({ one, many }) => ({
    medicalHistory: one(medicalHistories, {
      fields: [prescriptions.medicalHistoryId],
      references: [medicalHistories.id],
    }),
    prescriptionMedicines: many(prescriptionMedicines),
  })
);

export const medicinesRelations = relations(medicines, ({ one, many }) => ({
  pharmacist: one(users, {
    fields: [medicines.pharmacistId],
    references: [users.id],
  }),
  stocks: many(medicineStocks),
  prescriptionMedicines: many(prescriptionMedicines),
}));

export const medicineStocksRelations = relations(
  medicineStocks,
  ({ one, many }) => ({
    medicine: one(medicines, {
      fields: [medicineStocks.medicineId],
      references: [medicines.id],
    }),
    prescriptionMedicines: many(prescriptionMedicines),
  })
);

export const prescriptionMedicinesRelations = relations(
  prescriptionMedicines,
  ({ one }) => ({
    prescription: one(prescriptions, {
      fields: [prescriptionMedicines.prescriptionId],
      references: [prescriptions.id],
    }),
    medicine: one(medicines, {
      fields: [prescriptionMedicines.medicineId],
      references: [medicines.id],
    }),
    stock: one(medicineStocks, {
      fields: [prescriptionMedicines.stockId],
      references: [medicineStocks.id],
    }),
  })
);
