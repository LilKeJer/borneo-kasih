import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
