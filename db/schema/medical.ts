import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  boolean,
  integer,
  index,
  date,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { users } from "./auth";
import { reservations } from "./reservation";
import { serviceCatalog } from "./payment";

// Practice Session
export const practiceSessions = pgTable("PracticeSession", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Doctor Schedule
export const doctorSchedules = pgTable(
  "DoctorSchedule",
  {
    id: serial("id").primaryKey(),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => users.id),
    sessionId: integer("session_id")
      .notNull()
      .references(() => practiceSessions.id),
    dayOfWeek: integer("day_of_week").notNull(),
    maxPatients: integer("max_patients").default(30),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      doctorScheduleIdx: index("idx_doctor_schedule").on(
        table.doctorId,
        table.dayOfWeek
      ),
      activeScheduleIdx: index("idx_active_schedule").on(table.isActive),
      dayOfWeekCheck: check(
        "check_day_of_week",
        sql`${table.dayOfWeek} BETWEEN 0 AND 6`
      ),
      uniqueDoctorScheduleIdx: uniqueIndex("unique_doctor_schedule").on(
        table.doctorId,
        table.sessionId,
        table.dayOfWeek
      ),
    };
  }
);

// Daily Schedule Status
export const dailyScheduleStatuses = pgTable(
  "DailyScheduleStatus",
  {
    id: serial("id").primaryKey(),
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => doctorSchedules.id),
    date: date("date").notNull(),
    isActive: boolean("is_active").default(true),
    currentReservations: integer("current_reservations").default(0),
    notes: varchar("notes", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      dateIdx: index("idx_schedule_date").on(table.date),
      uniqueDailyScheduleIdx: uniqueIndex("unique_daily_schedule").on(
        table.scheduleId,
        table.date
      ),
    };
  }
);

// Medical History
export const medicalHistories = pgTable(
  "MedicalHistory",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => users.id),
    reservationId: integer("reservation_id").references(() => reservations.id),
    nurseId: integer("nurse_id")
      .notNull()
      .references(() => users.id),

    // Data terenkripsi untuk catatan perawat
    encryptedNurseNotes: text("encrypted_nurse_notes"),
    encryptionIvNurse: text("encryption_iv_nurse"),

    nurseCheckupTimestamp: timestamp("nurse_checkup_timestamp").defaultNow(),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => users.id),

    // Data terenkripsi untuk catatan dokter
    encryptedCondition: text("encrypted_condition"),
    encryptedDescription: text("encrypted_description"),
    encryptedTreatment: text("encrypted_treatment"),
    encryptedDoctorNotes: text("encrypted_doctor_notes"),
    encryptionIvDoctor: text("encryption_iv_doctor"),

    dateOfDiagnosis: date("date_of_diagnosis"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      patientRecordsIdx: index("idx_patient_records").on(table.patientId),
      reservationRecordsIdx: index("idx_medical_history_reservation").on(
        table.reservationId
      ),
      diagnosisDateIdx: index("idx_diagnosis_date").on(table.dateOfDiagnosis),
      doctorRecordsIdx: index("idx_doctor_records").on(table.doctorId),
    };
  }
);

export const medicalHistoryServices = pgTable(
  "MedicalHistoryService",
  {
    id: serial("id").primaryKey(),
    medicalHistoryId: integer("medical_history_id")
      .notNull()
      .references(() => medicalHistories.id),
    serviceId: integer("service_id")
      .notNull()
      .references(() => serviceCatalog.id),
    quantity: integer("quantity").notNull().default(1),
    notes: varchar("notes", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      medicalHistoryIdx: index("idx_medical_history_service_history").on(
        table.medicalHistoryId
      ),
      serviceIdx: index("idx_medical_history_service_service").on(
        table.serviceId
      ),
      quantityCheck: check(
        "check_medical_history_service_quantity",
        sql`${table.quantity} > 0`
      ),
    };
  }
);

// Relations
export const medicalHistoriesRelations = relations(
  medicalHistories,
  ({ one, many }) => ({
    patient: one(users, {
      fields: [medicalHistories.patientId],
      references: [users.id],
    }),
    reservation: one(reservations, {
      fields: [medicalHistories.reservationId],
      references: [reservations.id],
    }),
    nurse: one(users, {
      fields: [medicalHistories.nurseId],
      references: [users.id],
    }),
    doctor: one(users, {
      fields: [medicalHistories.doctorId],
      references: [users.id],
    }),
    services: many(medicalHistoryServices),
  })
);

export const medicalHistoryServicesRelations = relations(
  medicalHistoryServices,
  ({ one }) => ({
    medicalHistory: one(medicalHistories, {
      fields: [medicalHistoryServices.medicalHistoryId],
      references: [medicalHistories.id],
    }),
    service: one(serviceCatalog, {
      fields: [medicalHistoryServices.serviceId],
      references: [serviceCatalog.id],
    }),
  })
);

export const doctorSchedulesRelations = relations(
  doctorSchedules,
  ({ one, many }) => ({
    doctor: one(users, {
      fields: [doctorSchedules.doctorId],
      references: [users.id],
    }),
    session: one(practiceSessions, {
      fields: [doctorSchedules.sessionId],
      references: [practiceSessions.id],
    }),
    dailyStatuses: many(dailyScheduleStatuses),
  })
);

export const dailyScheduleStatusesRelations = relations(
  dailyScheduleStatuses,
  ({ one }) => ({
    schedule: one(doctorSchedules, {
      fields: [dailyScheduleStatuses.scheduleId],
      references: [doctorSchedules.id],
    }),
  })
);
