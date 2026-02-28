import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  index,
  decimal,
  check,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { users } from "./auth";
import { doctorSchedules } from "./medical";
import { prescriptions } from "./pharmacy";
import { paymentDetails } from "./payment";
// Reservation
export const reservations = pgTable(
  "Reservation",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => users.id),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => users.id),
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => doctorSchedules.id),
    reservationDate: timestamp("reservation_date").notNull(),
    queueNumber: integer("queue_number"),
    status: varchar("status", { length: 20 }).notNull(),
    examinationStatus: varchar("examination_status", { length: 20 }),
    complaint: text("complaint"),
    isPriority: boolean("is_priority").default(false),
    priorityReason: varchar("priority_reason", { length: 255 }),
    cancellationReason: varchar("cancellation_reason", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      reservationDateIdx: index("idx_reservation_date").on(
        table.reservationDate
      ),
      patientIdx: index("idx_reservation_patient").on(table.patientId),
      doctorIdx: index("idx_reservation_doctor").on(table.doctorId),
      statusIdx: index("idx_reservation_status").on(table.status),
      statusCheck: check(
        "check_reservation_status",
        sql`${table.status} IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')`
      ),
      examinationStatusCheck: check(
        "check_examination_status",
        sql`${table.examinationStatus} IS NULL OR ${table.examinationStatus} IN ('Waiting', 'In Progress', 'Completed', 'Cancelled', 'Waiting for Payment')`
      ),
    };
  }
);

// Payment
export const payments = pgTable(
  "Payment",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => users.id),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => reservations.id),
    receptionistId: integer("receptionist_id")
      .notNull()
      .references(() => users.id),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    paymentDate: timestamp("payment_date").defaultNow(),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    prescriptionId: integer("prescription_id").references(
      () => prescriptions.id
    ),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      paymentDateIdx: index("idx_payment_date").on(table.paymentDate),
      patientIdx: index("idx_payment_patient").on(table.patientId),
      reservationIdx: index("idx_payment_reservation").on(table.reservationId),
      statusIdx: index("idx_payment_status").on(table.status),
      methodIdx: index("idx_payment_method").on(table.paymentMethod),
      totalAmountCheck: check(
        "check_total_amount",
        sql`${table.totalAmount} >= 0`
      ),
      paymentMethodCheck: check(
        "check_payment_method",
        sql`${table.paymentMethod} IN ('Cash', 'Debit', 'Credit', 'Transfer', 'BPJS')`
      ),
      statusCheck: check(
        "check_payment_status",
        sql`${table.status} IN ('Pending', 'Paid', 'Cancelled')`
      ),
    };
  }
);

// Relations
export const reservationsRelations = relations(
  reservations,
  ({ one, many }) => ({
    patient: one(users, {
      fields: [reservations.patientId],
      references: [users.id],
    }),
    doctor: one(users, {
      fields: [reservations.doctorId],
      references: [users.id],
    }),
    schedule: one(doctorSchedules, {
      fields: [reservations.scheduleId],
      references: [doctorSchedules.id],
    }),
    payments: many(payments),
  })
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  patient: one(users, {
    fields: [payments.patientId],
    references: [users.id],
  }),
  reservation: one(reservations, {
    fields: [payments.reservationId],
    references: [reservations.id],
  }),
  receptionist: one(users, {
    fields: [payments.receptionistId],
    references: [users.id],
  }),
  prescription: one(prescriptions, {
    fields: [payments.prescriptionId],
    references: [prescriptions.id],
  }),
  details: many(paymentDetails), // Relasi baru ke payment details
}));
