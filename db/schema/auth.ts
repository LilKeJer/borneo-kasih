import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  index,
  check,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Base Users table
export const users = pgTable(
  "Users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).default("Active"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: integer("verified_by").references((): AnyPgColumn => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      usernameIdx: index("idx_username").on(table.username),
      roleIdx: index("idx_role").on(table.role),
      statusIdx: index("idx_user_status").on(table.status),
      roleCheck: check(
        "check_role",
        sql`${table.role} IN ('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Patient')`
      ),
      statusCheck: check(
        "check_user_status",
        sql`${table.status} IN ('Active', 'Pending', 'Verified', 'Suspended', 'Inactive', 'Rejected')`
      ),
    };
  }
);

// Admin details
export const adminDetails = pgTable(
  "AdminDetails",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).unique(),
    phone: varchar("phone", { length: 20 }),
  },
  (table) => {
    return {
      nameIdx: index("idx_admin_name").on(table.name),
    };
  }
);

// Doctor details
export const doctorDetails = pgTable(
  "DoctorDetails",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    specialization: varchar("specialization", { length: 100 }),
    email: varchar("email", { length: 100 }).unique(),
    phone: varchar("phone", { length: 20 }),
  },
  (table) => {
    return {
      nameIdx: index("idx_doctor_name").on(table.name),
      specializationIdx: index("idx_specialization").on(table.specialization),
    };
  }
);

// Nurse details
export const nurseDetails = pgTable(
  "NurseDetails",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).unique(),
    phone: varchar("phone", { length: 20 }),
  },
  (table) => {
    return {
      nameIdx: index("idx_nurse_name").on(table.name),
    };
  }
);

// Receptionist details
export const receptionistDetails = pgTable(
  "ReceptionistDetails",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).unique(),
    phone: varchar("phone", { length: 20 }),
  },
  (table) => {
    return {
      nameIdx: index("idx_receptionist_name").on(table.name),
    };
  }
);

// Pharmacist details
export const pharmacistDetails = pgTable(
  "PharmacistDetails",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).unique(),
    phone: varchar("phone", { length: 20 }),
  },
  (table) => {
    return {
      nameIdx: index("idx_pharmacist_name").on(table.name),
    };
  }
);

// Patient details
export const patientDetails = pgTable(
  "PatientDetails",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id),
    nik: varchar("nik", { length: 16 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).unique(),
    phone: varchar("phone", { length: 20 }),
    dateOfBirth: timestamp("date_of_birth"),
    address: varchar("address", { length: 255 }),
    gender: varchar("gender", { length: 1 }),
  },
  (table) => {
    return {
      nameIdx: index("idx_patient_name").on(table.name),
      nikIdx: index("idx_nik").on(table.nik),
      genderCheck: check("check_gender", sql`${table.gender} IN ('L', 'P')`),
    };
  }
);

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  adminDetails: one(adminDetails, {
    fields: [users.id],
    references: [adminDetails.userId],
  }),
  doctorDetails: one(doctorDetails, {
    fields: [users.id],
    references: [doctorDetails.userId],
  }),
  nurseDetails: one(nurseDetails, {
    fields: [users.id],
    references: [nurseDetails.userId],
  }),
  receptionistDetails: one(receptionistDetails, {
    fields: [users.id],
    references: [receptionistDetails.userId],
  }),
  pharmacistDetails: one(pharmacistDetails, {
    fields: [users.id],
    references: [pharmacistDetails.userId],
  }),
  patientDetails: one(patientDetails, {
    fields: [users.id],
    references: [patientDetails.userId],
  }),
}));
