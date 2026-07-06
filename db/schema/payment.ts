// db/schema/payment.ts
import {
  pgTable,
  serial,
  varchar,
  decimal,
  boolean,
  timestamp,
  index,
  check,
  integer,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

import { doctorDetails, users } from "./auth";
import { payments } from "./reservation";
import { prescriptions } from "./pharmacy";

// Tabel untuk Katalog Layanan Medis
export const serviceCatalog = pgTable(
  "ServiceCatalog",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 255 }),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    doctorId: integer("doctor_id").references(() => users.id),
    isDoctorDefault: boolean("is_doctor_default").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      nameIdx: index("idx_service_name").on(table.name),
      categoryIdx: index("idx_service_category").on(table.category),
      doctorIdx: index("idx_service_doctor").on(table.doctorId),
      doctorDefaultIdx: index("idx_service_doctor_default").on(
        table.doctorId,
        table.isDoctorDefault
      ),
      isActiveIdx: index("idx_service_active").on(table.isActive),
      priceCheck: check("check_base_price", sql`${table.basePrice} >= 0`),
      categoryCheck: check(
        "check_service_category",
        sql`${table.category} IN ('Konsultasi', 'Pemeriksaan', 'Tindakan', 'Lainnya')`
      ),
      doctorDefaultCheck: check(
        "check_doctor_default_service",
        sql`${table.isDoctorDefault} = false OR (${table.doctorId} IS NOT NULL AND ${table.category} = 'Konsultasi')`
      ),
    };
  }
);
export const serviceCatalogRelations = relations(
  serviceCatalog,
  ({ one, many }) => ({
    doctor: one(users, {
      fields: [serviceCatalog.doctorId],
      references: [users.id],
    }),
    doctorDetails: one(doctorDetails, {
      fields: [serviceCatalog.doctorId],
      references: [doctorDetails.userId],
    }),
    paymentDetails: many(paymentDetails),
  })
);
export const paymentDetails = pgTable(
  "PaymentDetail",
  {
    id: serial("id").primaryKey(),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => payments.id),
    itemType: varchar("item_type", { length: 20 }).notNull(),
    serviceId: integer("service_id").references(() => serviceCatalog.id),
    prescriptionId: integer("prescription_id").references(
      () => prescriptions.id
    ),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    notes: varchar("notes", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      paymentIdx: index("idx_payment_detail_payment").on(table.paymentId),
      itemTypeIdx: index("idx_payment_detail_type").on(table.itemType),
      serviceIdx: index("idx_payment_detail_service").on(table.serviceId),
      prescriptionIdx: index("idx_payment_detail_prescription").on(
        table.prescriptionId
      ),
      quantityCheck: check("check_quantity", sql`${table.quantity} > 0`),
      unitPriceCheck: check("check_unit_price", sql`${table.unitPrice} >= 0`),
      subtotalCheck: check("check_subtotal", sql`${table.subtotal} >= 0`),
      itemTypeCheck: check(
        "check_item_type",
        sql`${table.itemType} IN ('Service', 'Prescription', 'Other')`
      ),
    };
  }
);

// Relasi untuk PaymentDetail
export const paymentDetailsRelations = relations(paymentDetails, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentDetails.paymentId],
    references: [payments.id],
  }),
  service: one(serviceCatalog, {
    fields: [paymentDetails.serviceId],
    references: [serviceCatalog.id],
  }),
  prescription: one(prescriptions, {
    fields: [paymentDetails.prescriptionId],
    references: [prescriptions.id],
  }),
}));
