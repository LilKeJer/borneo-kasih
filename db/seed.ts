// db/seed.ts
import { db } from ".";
import { users, adminDetails, doctorDetails, practiceSessions } from "./schema";
import * as bcrypt from "bcrypt";

async function seed() {
  // Hapus data lama jika diperlukan (opsional)
  // Skip step ini di production!

  // Tambahkan sesi praktik
  await db.insert(practiceSessions).values([
    {
      name: "Pagi",
      startTime: new Date("2023-01-01T08:00:00"),
      endTime: new Date("2023-01-01T12:00:00"),
      description: "Praktik sesi pagi",
    },
    {
      name: "Malam",
      startTime: new Date("2023-01-01T17:00:00"),
      endTime: new Date("2023-01-01T21:00:00"),
      description: "Praktik sesi malam",
    },
  ]);

  // Tambahkan admin
  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  const [adminUser] = await db
    .insert(users)
    .values({
      username: "admin",
      password: hashedAdminPassword,
      role: "Admin",
    })
    .returning({ id: users.id });

  await db.insert(adminDetails).values({
    userId: adminUser.id,
    name: "Admin Sistem",
    email: "admin@borneokasih.com",
    phone: "08123456789",
  });

  // Tambahkan dokter
  const hashedDoctorPassword = await bcrypt.hash("doctor123", 10);
  const [doctorUser] = await db
    .insert(users)
    .values({
      username: "dokter",
      password: hashedDoctorPassword,
      role: "Doctor",
    })
    .returning({ id: users.id });

  await db.insert(doctorDetails).values({
    userId: doctorUser.id,
    name: "Dr. Borneo",
    specialization: "Umum",
    email: "dokter@borneokasih.com",
    phone: "08123456790",
  });

  // Tambahkan user lain jika diperlukan...

  console.log("Seed completed!");
}

seed().catch(console.error);
