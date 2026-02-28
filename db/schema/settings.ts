import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const clinicSettings = pgTable("ClinicSettings", {
  id: serial("id").primaryKey(),
  clinicName: varchar("clinic_name", { length: 150 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  morningStart: varchar("morning_start", { length: 5 }).notNull(),
  morningEnd: varchar("morning_end", { length: 5 }).notNull(),
  eveningStart: varchar("evening_start", { length: 5 }).notNull(),
  eveningEnd: varchar("evening_end", { length: 5 }).notNull(),
  enableStrictCheckIn: boolean("enable_strict_checkin").notNull().default(false),
  checkInEarlyMinutes: integer("checkin_early_minutes").notNull().default(120),
  checkInLateMinutes: integer("checkin_late_minutes").notNull().default(60),
  enableAutoCancel: boolean("enable_auto_cancel").notNull().default(false),
  autoCancelGraceMinutes: integer("auto_cancel_grace_minutes").notNull().default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
