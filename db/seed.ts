import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as dotenv from "dotenv";
import * as bcrypt from "bcrypt";
import { Pool } from "pg";
import {
  DEFAULT_DEMO_ENCRYPTION_JWK,
  encryptData,
  importEncryptionKey,
} from "../lib/utils/encryption";
import * as schema from "./schema";
import {
  adminDetails,
  clinicSettings,
  dailyScheduleStatuses,
  doctorDetails,
  doctorSchedules,
  medicalHistories,
  medicalHistoryServices,
  medicines,
  medicineStocks,
  nurseDetails,
  patientDetails,
  paymentDetails,
  payments,
  pharmacistDetails,
  practiceSessions,
  prescriptionMedicines,
  prescriptions,
  receptionistDetails,
  reservations,
  serviceCatalog,
  users,
} from "./schema";

dotenv.config();

const TEST_PASSWORD = "test12345";

function startOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function addMinutes(value: Date, minutes: number): Date {
  const result = new Date(value);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function setTime(value: Date, hours: number, minutes: number): Date {
  const result = new Date(value);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function toSessionClockTime(value: Date): Date {
  const base = new Date("2000-01-01T00:00:00");
  return setTime(base, value.getHours(), value.getMinutes());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function setTimeFromNowOnDay(params: {
  day: Date;
  now: Date;
  offsetMinutes: number;
  fallbackHour: number;
  fallbackMinute: number;
}): Date {
  const candidate = addMinutes(params.now, params.offsetMinutes);

  if (isSameDay(candidate, params.day)) {
    return candidate;
  }

  return setTime(params.day, params.fallbackHour, params.fallbackMinute);
}

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function encryptNamedFields(
  key: CryptoKey,
  values: Record<string, string>
) {
  const encryptedValues: Record<string, string> = {};
  const ivMap: Record<string, string> = {};

  for (const [field, value] of Object.entries(values)) {
    const { ciphertext, iv } = await encryptData(value, key);
    encryptedValues[field] = ciphertext;
    ivMap[field] = iv;
  }

  return {
    encryptedValues,
    ivMap,
  };
}

async function encryptMedicalHistorySeed(
  key: CryptoKey,
  values: {
    nurseNotes: string;
    condition: string;
    description: string;
    treatment: string;
    doctorNotes: string;
  }
) {
  const nurse = await encryptData(values.nurseNotes, key);
  const doctor = await encryptNamedFields(key, {
    condition: values.condition,
    description: values.description,
    treatment: values.treatment,
    doctorNotes: values.doctorNotes,
  });

  return {
    encryptedNurseNotes: nurse.ciphertext,
    encryptionIvNurse: nurse.iv,
    encryptedCondition: doctor.encryptedValues.condition,
    encryptedDescription: doctor.encryptedValues.description,
    encryptedTreatment: doctor.encryptedValues.treatment,
    encryptedDoctorNotes: doctor.encryptedValues.doctorNotes,
    encryptionIvDoctor: JSON.stringify(doctor.ivMap),
  };
}

async function encryptPrescriptionSeed(
  key: CryptoKey,
  values: {
    dosage: string;
    frequency: string;
    duration: string;
  }
) {
  const encrypted = await encryptNamedFields(key, {
    dosage: values.dosage,
    frequency: values.frequency,
    duration: values.duration,
  });

  return {
    encryptedDosage: encrypted.encryptedValues.dosage,
    encryptedFrequency: encrypted.encryptedValues.frequency,
    encryptedDuration: encrypted.encryptedValues.duration,
    encryptionIv: JSON.stringify(encrypted.ivMap),
  };
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  const db = drizzle(pool, { schema });

  try {
    const now = new Date();
    const today = startOfDay(now);
    const sevenDaysAgo = addDays(today, -7);
    const sixDaysAgo = addDays(today, -6);
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);
    const fiveDaysAgo = addDays(today, -5);
    const fourDaysAgo = addDays(today, -4);
    const threeDaysAgo = addDays(today, -3);

    const expiryIn30Days = addDays(today, 30);
    const expiryIn90Days = addDays(today, 90);
    const expiryIn180Days = addDays(today, 180);
    const expired5DaysAgo = addDays(today, -5);

    // Dynamic reservation times so seed remains useful at any execution time.
    const waitingAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: -30,
      fallbackHour: 9,
      fallbackMinute: 0,
    });
    const inProgressAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: -15,
      fallbackHour: 9,
      fallbackMinute: 30,
    });
    const waitingPaymentAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: -60,
      fallbackHour: 8,
      fallbackMinute: 45,
    });
    const completedTodayAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: -180,
      fallbackHour: 8,
      fallbackMinute: 15,
    });
    const pendingTodayAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: 45,
      fallbackHour: 10,
      fallbackMinute: 30,
    });

    const autoCancelSessionStartAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: 5,
      fallbackHour: 20,
      fallbackMinute: 0,
    });
    const autoCancelSessionEndAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: 125,
      fallbackHour: 22,
      fallbackMinute: 0,
    });
    const autoCancelCandidateAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: 15,
      fallbackHour: 20,
      fallbackMinute: 15,
    });
    const autoCancelSessionStartClock = toSessionClockTime(autoCancelSessionStartAt);
    const autoCancelSessionEndClock = toSessionClockTime(autoCancelSessionEndAt);
    const autoCancelExpectedAt = addMinutes(autoCancelSessionEndAt, 1);

    const tomorrowPendingAt = setTime(tomorrow, now.getHours(), now.getMinutes());
    const completedYesterdayAt = setTime(yesterday, 10, 0);
    const staleNoShowYesterdayAt = setTime(yesterday, 11, 0);
    const waitingFollowUpAt = setTimeFromNowOnDay({
      day: today,
      now,
      offsetMinutes: -5,
      fallbackHour: 10,
      fallbackMinute: 10,
    });
    const tomorrowSecondPendingAt = setTime(tomorrow, 14, 0);
    const patientTwoPastAt = setTime(fourDaysAgo, 9, 30);
    const patientThreePastAt = setTime(fiveDaysAgo, 14, 0);
    const patientFourRecentAt = setTime(threeDaysAgo, 10, 45);
    const patientFourOlderAt = setTime(sevenDaysAgo, 9, 10);
    const patientFivePastAt = setTime(sixDaysAgo, 15, 15);

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const demoEncryptionKey = await importEncryptionKey(
      DEFAULT_DEMO_ENCRYPTION_JWK
    );

    await db.transaction(async (tx) => {
      // For local/dev testing only. This clears all app data.
      await tx.execute(sql`
      TRUNCATE TABLE
        "PaymentDetail",
        "Payment",
        "PrescriptionMedicine",
        "Prescription",
        "MedicineStock",
        "Medicine",
        "MedicalHistoryService",
        "MedicalHistory",
        "Reservation",
        "DailyScheduleStatus",
        "DoctorSchedule",
        "PracticeSession",
        "ServiceCatalog",
        "ClinicSettings",
        "AdminDetails",
        "DoctorDetails",
        "NurseDetails",
        "ReceptionistDetails",
        "PharmacistDetails",
        "PatientDetails",
        "Users"
      RESTART IDENTITY CASCADE
    `);

    const [adminUser] = await tx
      .insert(users)
      .values({
        email: "admin@klinik.local",
        password: passwordHash,
        role: "Admin",
        status: "Active",
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(adminDetails).values({
      userId: adminUser.id,
      name: "Admin Sistem",
      email: "admin@klinik.local",
      phone: "081111111111",
    });

    const [doctorUser] = await tx
      .insert(users)
      .values({
        email: "doctor@klinik.local",
        password: passwordHash,
        role: "Doctor",
        status: "Active",
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(doctorDetails).values({
      userId: doctorUser.id,
      name: "Dr. Borneo",
      specialization: "Dokter Umum",
      email: "doctor@klinik.local",
      phone: "081222222222",
    });

    const [nurseUser] = await tx
      .insert(users)
      .values({
        email: "nurse@klinik.local",
        password: passwordHash,
        role: "Nurse",
        status: "Active",
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(nurseDetails).values({
      userId: nurseUser.id,
      name: "Perawat Sinta",
      email: "nurse@klinik.local",
      phone: "081333333333",
    });

    const [receptionistUser] = await tx
      .insert(users)
      .values({
        email: "receptionist@klinik.local",
        password: passwordHash,
        role: "Receptionist",
        status: "Active",
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(receptionistDetails).values({
      userId: receptionistUser.id,
      name: "Rina Frontdesk",
      email: "receptionist@klinik.local",
      phone: "081444444444",
    });

    const [pharmacistUser] = await tx
      .insert(users)
      .values({
        email: "pharmacist@klinik.local",
        password: passwordHash,
        role: "Pharmacist",
        status: "Active",
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(pharmacistDetails).values({
      userId: pharmacistUser.id,
      name: "Faris Farmasi",
      email: "pharmacist@klinik.local",
      phone: "081555555555",
    });

    const [patientOneUser] = await tx
      .insert(users)
      .values({
        email: "patient1@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Verified",
        verifiedAt: addDays(today, -3),
        verifiedBy: adminUser.id,
        createdAt: addDays(today, -4),
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: patientOneUser.id,
      nik: "6371010000000001",
      name: "Andi Saputra",
      email: "patient1@klinik.local",
      phone: "081666666661",
      dateOfBirth: new Date("1995-03-15"),
      address: "Jl. Kenanga No. 10",
      gender: "L",
    });

    const [patientTwoUser] = await tx
      .insert(users)
      .values({
        email: "patient2@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Verified",
        verifiedAt: addDays(today, -2),
        verifiedBy: adminUser.id,
        createdAt: addDays(today, -2),
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: patientTwoUser.id,
      nik: "6371010000000002",
      name: "Siti Aisyah",
      email: "patient2@klinik.local",
      phone: "081666666662",
      dateOfBirth: new Date("1993-11-21"),
      address: "Jl. Melati No. 22",
      gender: "P",
    });

    const [patientThreeUser] = await tx
      .insert(users)
      .values({
        email: "patient3@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Verified",
        verifiedAt: addDays(today, -1),
        verifiedBy: adminUser.id,
        createdAt: addDays(today, -1),
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: patientThreeUser.id,
      nik: "6371010000000003",
      name: "Budi Santoso",
      email: "patient3@klinik.local",
      phone: "081666666663",
      dateOfBirth: new Date("1989-06-07"),
      address: "Jl. Cempaka No. 5",
      gender: "L",
    });

    const [pendingPatientUser] = await tx
      .insert(users)
      .values({
        email: "pending@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Pending",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: pendingPatientUser.id,
      nik: "6371010000000004",
      name: "Calon Pasien Pending",
      email: "pending@klinik.local",
      phone: "081666666664",
      dateOfBirth: new Date("2000-01-01"),
      address: "Jl. Pending No. 1",
      gender: "P",
    });

    const [pendingIncompleteUser] = await tx
      .insert(users)
      .values({
        email: "pending2@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Pending",
        createdAt: addMinutes(now, -20),
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: pendingIncompleteUser.id,
      nik: "6371010000000005",
      name: "Nadia Putri",
      email: "pending2@klinik.local",
      phone: null,
      dateOfBirth: new Date("1998-04-12"),
      address: null,
      gender: "P",
    });

    const [patientFourUser] = await tx
      .insert(users)
      .values({
        email: "patient4@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Verified",
        verifiedAt: threeDaysAgo,
        verifiedBy: adminUser.id,
        createdAt: fourDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: patientFourUser.id,
      nik: "6371010000000006",
      name: "Dewi Kartika",
      email: "patient4@klinik.local",
      phone: "081666666665",
      dateOfBirth: new Date("1991-02-14"),
      address: "Jl. Anggrek No. 8",
      gender: "P",
    });

    const [patientFiveUser] = await tx
      .insert(users)
      .values({
        email: "patient5@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Verified",
        verifiedAt: sixDaysAgo,
        verifiedBy: adminUser.id,
        createdAt: sevenDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: patientFiveUser.id,
      nik: "6371010000000007",
      name: "Fajar Nugraha",
      email: "patient5@klinik.local",
      phone: "081666666666",
      dateOfBirth: new Date("1987-08-27"),
      address: "Jl. Dahlia No. 17",
      gender: "L",
    });

    const [suspendedPatientUser] = await tx
      .insert(users)
      .values({
        email: "suspended@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Suspended",
        verifiedAt: fiveDaysAgo,
        verifiedBy: adminUser.id,
        createdAt: sixDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: suspendedPatientUser.id,
      nik: "6371010000000008",
      name: "Maya Puspita",
      email: "suspended@klinik.local",
      phone: "081666666667",
      dateOfBirth: new Date("1990-10-03"),
      address: "Jl. Flamboyan No. 3",
      gender: "P",
    });

    const [inactivePatientUser] = await tx
      .insert(users)
      .values({
        email: "inactive@klinik.local",
        password: passwordHash,
        role: "Patient",
        status: "Inactive",
        verifiedAt: fourDaysAgo,
        verifiedBy: adminUser.id,
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(patientDetails).values({
      userId: inactivePatientUser.id,
      nik: "6371010000000009",
      name: "Rizal Pratama",
      email: "inactive@klinik.local",
      phone: "081666666668",
      dateOfBirth: new Date("1985-12-19"),
      address: "Jl. Teratai No. 21",
      gender: "L",
    });

    const [morningSession, afternoonSession, standbySession, autoCancelTestSession] = await tx
      .insert(practiceSessions)
      .values([
        {
          name: "Pagi",
          startTime: new Date("2000-01-01T08:00:00"),
          endTime: new Date("2000-01-01T12:00:00"),
          description: "Sesi praktik pagi",
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Sore",
          startTime: new Date("2000-01-01T13:00:00"),
          endTime: new Date("2000-01-01T17:00:00"),
          description: "Sesi praktik sore",
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Jaga",
          startTime: new Date("2000-01-01T00:00:00"),
          endTime: new Date("2099-12-31T23:59:00"),
          description: "Sesi jaga untuk testing",
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "AutoCancel Test",
          startTime: autoCancelSessionStartClock,
          endTime: autoCancelSessionEndClock,
          description: "Sesi dinamis untuk uji auto-cancel cepat (2 jam)",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning({ id: practiceSessions.id, name: practiceSessions.name });

    const allDaySchedules = await tx
      .insert(doctorSchedules)
      .values(
        Array.from({ length: 7 }, (_, dayOfWeek) => ({
          doctorId: doctorUser.id,
          sessionId: standbySession.id,
          dayOfWeek,
          maxPatients: 50,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning({
        id: doctorSchedules.id,
        dayOfWeek: doctorSchedules.dayOfWeek,
      });

    const currentDay = today.getDay();

    await tx.insert(doctorSchedules).values({
      doctorId: doctorUser.id,
      sessionId: morningSession.id,
      dayOfWeek: currentDay,
      maxPatients: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(doctorSchedules).values({
      doctorId: doctorUser.id,
      sessionId: afternoonSession.id,
      dayOfWeek: currentDay,
      maxPatients: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const [autoCancelTestSchedule] = await tx
      .insert(doctorSchedules)
      .values({
        doctorId: doctorUser.id,
        sessionId: autoCancelTestSession.id,
        dayOfWeek: currentDay,
        maxPatients: 5,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: doctorSchedules.id });

    const getRecurringScheduleId = (date: Date) => {
      const scheduleId =
        allDaySchedules.find((schedule) => schedule.dayOfWeek === date.getDay())
          ?.id ?? null;

      if (!scheduleId) {
        throw new Error(
          `Gagal menentukan schedule harian untuk seed tanggal ${toDateOnly(date)}`
        );
      }

      return scheduleId;
    };

    const todayScheduleId = getRecurringScheduleId(today);
    const tomorrowScheduleId = getRecurringScheduleId(tomorrow);
    const yesterdayScheduleId = getRecurringScheduleId(yesterday);
    const threeDaysAgoScheduleId = getRecurringScheduleId(threeDaysAgo);
    const fourDaysAgoScheduleId = getRecurringScheduleId(fourDaysAgo);
    const fiveDaysAgoScheduleId = getRecurringScheduleId(fiveDaysAgo);
    const sixDaysAgoScheduleId = getRecurringScheduleId(sixDaysAgo);
    const sevenDaysAgoScheduleId = getRecurringScheduleId(sevenDaysAgo);

    await tx.insert(dailyScheduleStatuses).values([
      {
        scheduleId: todayScheduleId,
        date: toDateOnly(today),
        isActive: true,
        currentReservations: 6,
        notes: "Seed hari ini (dinamis)",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: tomorrowScheduleId,
        date: toDateOnly(tomorrow),
        isActive: true,
        currentReservations: 2,
        notes: "Seed besok",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: autoCancelTestSchedule.id,
        date: toDateOnly(today),
        isActive: true,
        currentReservations: 1,
        notes: "Seed auto-cancel test (dinamis)",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: yesterdayScheduleId,
        date: toDateOnly(yesterday),
        isActive: true,
        currentReservations: 2,
        notes: "Seed kemarin (dinamis)",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: threeDaysAgoScheduleId,
        date: toDateOnly(threeDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed tiga hari lalu",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: fourDaysAgoScheduleId,
        date: toDateOnly(fourDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed empat hari lalu",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: fiveDaysAgoScheduleId,
        date: toDateOnly(fiveDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed lima hari lalu",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: sixDaysAgoScheduleId,
        date: toDateOnly(sixDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed enam hari lalu",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: sevenDaysAgoScheduleId,
        date: toDateOnly(sevenDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed tujuh hari lalu",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const [
      consultationService,
      followUpConsultationService,
      labService,
      bloodSugarService,
      urineTestService,
      procedureService,
      woundCareService,
      vitaminInjectionService,
      adminFeeService,
      healthCertificateService,
    ] = await tx
      .insert(serviceCatalog)
      .values([
        {
          name: "Konsultasi Umum",
          description: "Pemeriksaan awal dokter umum",
          basePrice: "150000.00",
          category: "Konsultasi",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Konsultasi Kontrol",
          description: "Kunjungan kontrol pasca terapi atau evaluasi lanjutan",
          basePrice: "100000.00",
          category: "Konsultasi",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Tes Darah Lengkap",
          description: "Pemeriksaan laboratorium dasar",
          basePrice: "200000.00",
          category: "Pemeriksaan",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Cek Gula Darah Sewaktu",
          description: "Skrining kadar gula darah cepat",
          basePrice: "85000.00",
          category: "Pemeriksaan",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Urinalisis Sederhana",
          description: "Pemeriksaan urine dasar untuk infeksi atau dehidrasi",
          basePrice: "90000.00",
          category: "Pemeriksaan",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Nebulizer",
          description: "Tindakan terapi pernapasan",
          basePrice: "120000.00",
          category: "Tindakan",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Perawatan Luka Ringan",
          description: "Pembersihan luka, dressing, dan observasi infeksi ringan",
          basePrice: "135000.00",
          category: "Tindakan",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Injeksi Vitamin B Kompleks",
          description: "Tindakan injeksi vitamin untuk pemulihan umum",
          basePrice: "110000.00",
          category: "Tindakan",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Biaya Administrasi",
          description: "Biaya layanan tambahan",
          basePrice: "25000.00",
          category: "Lainnya",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Surat Keterangan Sehat",
          description: "Penerbitan surat sehat setelah pemeriksaan dokter",
          basePrice: "50000.00",
          category: "Lainnya",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning({ id: serviceCatalog.id, name: serviceCatalog.name });

    const [
      paracetamol,
      amoxicillin,
      vitaminC,
      ibuprofen,
      cetirizine,
      omeprazole,
      salbutamol,
      oralit,
      zinc,
    ] = await tx
      .insert(medicines)
      .values([
        {
          name: "Paracetamol 500mg",
          description: "Obat penurun demam dan nyeri",
          category: "Analgesik",
          dosageForm: "Tablet",
          unit: "tablet",
          pharmacistId: pharmacistUser.id,
          price: "5000.00",
          minimumStock: 50,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Amoxicillin 500mg",
          description: "Antibiotik oral",
          category: "Antibiotik",
          dosageForm: "Kapsul",
          unit: "kapsul",
          pharmacistId: pharmacistUser.id,
          price: "7000.00",
          minimumStock: 30,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Vitamin C 500mg",
          description: "Suplemen vitamin C",
          category: "Suplemen",
          dosageForm: "Tablet",
          unit: "tablet",
          pharmacistId: pharmacistUser.id,
          price: "3000.00",
          minimumStock: 100,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Ibuprofen 400mg",
          description: "Obat antiinflamasi untuk nyeri dan peradangan ringan",
          category: "Analgesik",
          dosageForm: "Tablet",
          unit: "tablet",
          pharmacistId: pharmacistUser.id,
          price: "4500.00",
          minimumStock: 40,
          reorderThresholdPercentage: 25,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Cetirizine 10mg",
          description: "Antihistamin untuk alergi",
          category: "Antihistamin",
          dosageForm: "Tablet",
          unit: "tablet",
          pharmacistId: pharmacistUser.id,
          price: "4000.00",
          minimumStock: 20,
          reorderThresholdPercentage: 25,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Omeprazole 20mg",
          description: "Obat penurun asam lambung",
          category: "Gastrointestinal",
          dosageForm: "Kapsul",
          unit: "kapsul",
          pharmacistId: pharmacistUser.id,
          price: "6500.00",
          minimumStock: 25,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Salbutamol Sirup 60ml",
          description: "Sirup bronkodilator untuk keluhan mengi ringan",
          category: "Respirasi",
          dosageForm: "Sirup",
          unit: "botol",
          pharmacistId: pharmacistUser.id,
          price: "45000.00",
          minimumStock: 10,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Oralit Sachet",
          description: "Larutan elektrolit oral untuk rehidrasi",
          category: "Rehidrasi",
          dosageForm: "Serbuk",
          unit: "sachet",
          pharmacistId: pharmacistUser.id,
          price: "3500.00",
          minimumStock: 30,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Zinc 20mg",
          description: "Suplemen zinc untuk diare dan pemulihan",
          category: "Suplemen",
          dosageForm: "Tablet",
          unit: "tablet",
          pharmacistId: pharmacistUser.id,
          price: "2500.00",
          minimumStock: 25,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning({ id: medicines.id, name: medicines.name });

    const [
      paracetamolStock,
      amoxicillinStock,
      vitaminCStock,
      expiredVitaminC,
      ibuprofenStock,
      cetirizineStock,
      omeprazoleStock,
      salbutamolStock,
      expiredSalbutamol,
      oralitStock,
      zincStock,
    ] = await tx
      .insert(medicineStocks)
      .values([
        {
          medicineId: paracetamol.id,
          batchNumber: "PARA-001",
          quantity: 200,
          remainingQuantity: 176,
          expiryDate: toDateOnly(expiryIn180Days),
          supplier: "PT Obat Sehat",
          purchasePrice: "3500.00",
          addedAt: addDays(today, -30),
          isBelowThreshold: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: amoxicillin.id,
          batchNumber: "AMOX-001",
          quantity: 120,
          remainingQuantity: 96,
          expiryDate: toDateOnly(expiryIn90Days),
          supplier: "PT Farma Nusantara",
          purchasePrice: "5200.00",
          addedAt: addDays(today, -25),
          isBelowThreshold: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: vitaminC.id,
          batchNumber: "VITC-001",
          quantity: 20,
          remainingQuantity: 8,
          expiryDate: toDateOnly(expiryIn30Days),
          supplier: "PT Vitamin Prima",
          purchasePrice: "1800.00",
          addedAt: addDays(today, -20),
          isBelowThreshold: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: vitaminC.id,
          batchNumber: "VITC-OLD-001",
          quantity: 15,
          remainingQuantity: 5,
          expiryDate: toDateOnly(expired5DaysAgo),
          supplier: "PT Vitamin Prima",
          purchasePrice: "1750.00",
          addedAt: addDays(today, -60),
          isBelowThreshold: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: ibuprofen.id,
          batchNumber: "IBU-001",
          quantity: 150,
          remainingQuantity: 140,
          expiryDate: toDateOnly(expiryIn180Days),
          supplier: "PT Analgesik Sejahtera",
          purchasePrice: "3000.00",
          addedAt: addDays(today, -18),
          isBelowThreshold: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: cetirizine.id,
          batchNumber: "CET-001",
          quantity: 18,
          remainingQuantity: 6,
          expiryDate: toDateOnly(expiryIn90Days),
          supplier: "PT Alergi Farma",
          purchasePrice: "2400.00",
          addedAt: addDays(today, -12),
          isBelowThreshold: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: omeprazole.id,
          batchNumber: "OME-001",
          quantity: 100,
          remainingQuantity: 88,
          expiryDate: toDateOnly(expiryIn90Days),
          supplier: "PT Gastro Medika",
          purchasePrice: "4300.00",
          addedAt: addDays(today, -21),
          isBelowThreshold: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: salbutamol.id,
          batchNumber: "SALB-001",
          quantity: 24,
          remainingQuantity: 5,
          expiryDate: toDateOnly(expiryIn30Days),
          supplier: "PT Respirasi Prima",
          purchasePrice: "32000.00",
          addedAt: addDays(today, -16),
          isBelowThreshold: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: salbutamol.id,
          batchNumber: "SALB-EXP-001",
          quantity: 12,
          remainingQuantity: 3,
          expiryDate: toDateOnly(expired5DaysAgo),
          supplier: "PT Respirasi Prima",
          purchasePrice: "31500.00",
          addedAt: addDays(today, -60),
          isBelowThreshold: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: oralit.id,
          batchNumber: "ORA-001",
          quantity: 80,
          remainingQuantity: 75,
          expiryDate: toDateOnly(expiryIn90Days),
          supplier: "PT Rehidrasi Nusantara",
          purchasePrice: "2200.00",
          addedAt: addDays(today, -9),
          isBelowThreshold: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          medicineId: zinc.id,
          batchNumber: "ZINC-001",
          quantity: 30,
          remainingQuantity: 0,
          expiryDate: toDateOnly(expiryIn180Days),
          supplier: "PT Mineral Medika",
          purchasePrice: "1500.00",
          addedAt: addDays(today, -14),
          isBelowThreshold: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning({ id: medicineStocks.id, batchNumber: medicineStocks.batchNumber });

    const [reservationWaiting] = await tx
      .insert(reservations)
      .values({
        patientId: patientTwoUser.id,
        doctorId: doctorUser.id,
        scheduleId: todayScheduleId,
        reservationDate: waitingAt,
        queueNumber: 2,
        status: "Confirmed",
        examinationStatus: "Waiting",
        complaint: "Batuk berdahak",
        isPriority: false,
        priorityReason: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationInProgress] = await tx
      .insert(reservations)
      .values({
        patientId: patientOneUser.id,
        doctorId: doctorUser.id,
        scheduleId: todayScheduleId,
        reservationDate: inProgressAt,
        queueNumber: 1,
        status: "Confirmed",
        examinationStatus: "In Progress",
        complaint: "Demam sejak semalam disertai sesak napas ringan",
        isPriority: true,
        priorityReason: "Sesak napas ringan",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationWaitingPayment] = await tx
      .insert(reservations)
      .values({
        patientId: patientThreeUser.id,
        doctorId: doctorUser.id,
        scheduleId: todayScheduleId,
        reservationDate: waitingPaymentAt,
        queueNumber: 3,
        status: "Confirmed",
        examinationStatus: "Waiting for Payment",
        complaint: "Sakit kepala berulang",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationCompletedToday] = await tx
      .insert(reservations)
      .values({
        patientId: patientOneUser.id,
        doctorId: doctorUser.id,
        scheduleId: todayScheduleId,
        reservationDate: completedTodayAt,
        queueNumber: 4,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Flu dan nyeri tenggorokan",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationPendingToday] = await tx
      .insert(reservations)
      .values({
        patientId: patientOneUser.id,
        doctorId: doctorUser.id,
        scheduleId: todayScheduleId,
        reservationDate: pendingTodayAt,
        queueNumber: 5,
        status: "Pending",
        examinationStatus: null,
        complaint: "Kontrol alergi",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationWaitingFollowUp] = await tx
      .insert(reservations)
      .values({
        patientId: patientFourUser.id,
        doctorId: doctorUser.id,
        scheduleId: todayScheduleId,
        reservationDate: waitingFollowUpAt,
        queueNumber: 6,
        status: "Confirmed",
        examinationStatus: "Waiting",
        complaint: "Kontrol luka gores dan evaluasi perban",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationAutoCancelCandidate] = await tx
      .insert(reservations)
      .values({
        patientId: patientTwoUser.id,
        doctorId: doctorUser.id,
        scheduleId: autoCancelTestSchedule.id,
        reservationDate: autoCancelCandidateAt,
        queueNumber: 1,
        status: "Confirmed",
        examinationStatus: null,
        complaint: "Skenario no-show untuk uji auto-cancel",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationTomorrowSecond] = await tx
      .insert(reservations)
      .values({
        patientId: patientFiveUser.id,
        doctorId: doctorUser.id,
        scheduleId: tomorrowScheduleId,
        reservationDate: tomorrowSecondPendingAt,
        queueNumber: 2,
        status: "Pending",
        examinationStatus: null,
        complaint: "Konsultasi maag berulang setelah makan pedas",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationPatientTwoPast] = await tx
      .insert(reservations)
      .values({
        patientId: patientTwoUser.id,
        doctorId: doctorUser.id,
        scheduleId: fourDaysAgoScheduleId,
        reservationDate: patientTwoPastAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Nyeri saat buang air kecil dan anyang-anyangan",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      })
      .returning({ id: reservations.id });

    const [reservationPatientThreePast] = await tx
      .insert(reservations)
      .values({
        patientId: patientThreeUser.id,
        doctorId: doctorUser.id,
        scheduleId: fiveDaysAgoScheduleId,
        reservationDate: patientThreePastAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Perih ulu hati dan mual ringan",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      })
      .returning({ id: reservations.id });

    const [reservationPatientFourRecent] = await tx
      .insert(reservations)
      .values({
        patientId: patientFourUser.id,
        doctorId: doctorUser.id,
        scheduleId: threeDaysAgoScheduleId,
        reservationDate: patientFourRecentAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Luka gores pada kaki kanan setelah terjatuh",
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      })
      .returning({ id: reservations.id });

    const [reservationPatientFourOlder] = await tx
      .insert(reservations)
      .values({
        patientId: patientFourUser.id,
        doctorId: doctorUser.id,
        scheduleId: sevenDaysAgoScheduleId,
        reservationDate: patientFourOlderAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Batuk mengi terutama malam hari",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      })
      .returning({ id: reservations.id });

    const [reservationPatientFivePast] = await tx
      .insert(reservations)
      .values({
        patientId: patientFiveUser.id,
        doctorId: doctorUser.id,
        scheduleId: sixDaysAgoScheduleId,
        reservationDate: patientFivePastAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Diare, lemas, dan tanda dehidrasi ringan",
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      })
      .returning({ id: reservations.id });

    const [reservationTomorrow] = await tx
      .insert(reservations)
      .values({
        patientId: patientOneUser.id,
        doctorId: doctorUser.id,
        scheduleId: tomorrowScheduleId,
        reservationDate: tomorrowPendingAt,
        queueNumber: 1,
        status: "Pending",
        examinationStatus: null,
        complaint: "Kontrol pasca obat",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationNoShowYesterday] = await tx
      .insert(reservations)
      .values({
        patientId: patientThreeUser.id,
        doctorId: doctorUser.id,
        scheduleId: yesterdayScheduleId,
        reservationDate: staleNoShowYesterdayAt,
        queueNumber: 2,
        status: "Confirmed",
        examinationStatus: null,
        complaint: "Tidak hadir untuk kontrol",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      })
      .returning({ id: reservations.id });

    const [reservationCompletedYesterday] = await tx
      .insert(reservations)
      .values({
        patientId: patientOneUser.id,
        doctorId: doctorUser.id,
        scheduleId: yesterdayScheduleId,
        reservationDate: completedYesterdayAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Bersin, pilek, dan hidung tersumbat",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      })
      .returning({ id: reservations.id });

    // Avoid unused variable warnings in strict environments.
    void reservationWaiting;
    void reservationInProgress;
    void reservationPendingToday;
    void reservationWaitingFollowUp;
    void reservationAutoCancelCandidate;
    void reservationTomorrow;
    void reservationTomorrowSecond;
    void reservationNoShowYesterday;

    const historyWaitingPaymentEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Tekanan darah 120/80, suhu 37.3C, nyeri kepala 4/10",
        condition: "Cephalgia tegang",
        description: "Sakit kepala tipe tegang sejak dua hari tanpa defisit neurologis",
        treatment: "Istirahat, hidrasi, dan analgesik oral",
        doctorNotes: "Kontrol bila nyeri menetap atau muncul muntah hebat",
      }
    );

    const historyCompletedTodayEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Suhu 38.1C, tenggorokan hiperemis, batuk ringan",
        condition: "ISPA ringan",
        description: "Flu, demam ringan, dan radang tenggorokan tanpa sesak",
        treatment: "Antibiotik oral, antipiretik, dan istirahat",
        doctorNotes: "Perbanyak air hangat dan evaluasi bila belum membaik 3 hari",
      }
    );

    const historyCompletedYesterdayEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Konka hidung bengkak, suhu normal, bersin berulang",
        condition: "Rhinitis alergi",
        description: "Pilek dan hidung tersumbat dipicu paparan debu",
        treatment: "Antihistamin dan edukasi hindari pemicu",
        doctorNotes: "Gunakan masker saat bersih-bersih rumah",
      }
    );

    const historyPatientTwoPastEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Nyeri tekan suprapubik ringan, suhu 37.5C",
        condition: "Infeksi saluran kemih ringan",
        description: "Keluhan anyang-anyangan tanpa nyeri pinggang",
        treatment: "Antibiotik oral, hidrasi cukup, dan observasi gejala",
        doctorNotes: "Kembali bila demam tinggi atau nyeri pinggang",
      }
    );

    const historyPatientThreePastEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Nyeri ulu hati 3/10, nafsu makan menurun",
        condition: "Dispepsia akut ringan",
        description: "Keluhan lambung memburuk setelah telat makan dan minum kopi",
        treatment: "PPI oral dan modifikasi pola makan",
        doctorNotes: "Hindari kopi, pedas, dan makan larut malam selama satu minggu",
      }
    );

    const historyPatientFourRecentEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Luka gores 4 cm dengan kemerahan lokal ringan",
        condition: "Luka gores terinfeksi ringan",
        description: "Trauma ringan pada kaki kanan dengan infeksi superfisial",
        treatment: "Perawatan luka, pembersihan, dan ganti balut",
        doctorNotes: "Jaga luka tetap kering dan kontrol ulang 2 hari",
      }
    );

    const historyPatientFourOlderEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Wheezing ringan, saturasi 98 persen, tanpa distress",
        condition: "Bronkospasme ringan",
        description: "Batuk malam disertai mengi ringan tanpa sesak berat",
        treatment: "Nebulizer dan bronkodilator oral",
        doctorNotes: "Kembali bila mengi bertambah atau muncul sesak",
      }
    );

    const historyPatientFivePastEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Mukosa mulut kering, turgor kulit sedikit menurun",
        condition: "Dehidrasi ringan akibat gastroenteritis",
        description: "Diare akut tanpa darah dengan lemas dan asupan cairan berkurang",
        treatment: "Rehidrasi oral, zinc, dan terapi suportif",
        doctorNotes: "Pantau frekuensi BAB dan minum oralit tiap episode diare",
      }
    );

    const [historyWaitingPayment] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientThreeUser.id,
        reservationId: reservationWaitingPayment.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes: historyWaitingPaymentEncrypted.encryptedNurseNotes,
        encryptionIvNurse: historyWaitingPaymentEncrypted.encryptionIvNurse,
        nurseCheckupTimestamp: setTime(today, 10, 15),
        doctorId: doctorUser.id,
        encryptedCondition: historyWaitingPaymentEncrypted.encryptedCondition,
        encryptedDescription:
          historyWaitingPaymentEncrypted.encryptedDescription,
        encryptedTreatment: historyWaitingPaymentEncrypted.encryptedTreatment,
        encryptedDoctorNotes:
          historyWaitingPaymentEncrypted.encryptedDoctorNotes,
        encryptionIvDoctor: historyWaitingPaymentEncrypted.encryptionIvDoctor,
        dateOfDiagnosis: toDateOnly(today),
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: medicalHistories.id });

    const [historyCompletedToday] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientOneUser.id,
        reservationId: reservationCompletedToday.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes: historyCompletedTodayEncrypted.encryptedNurseNotes,
        encryptionIvNurse: historyCompletedTodayEncrypted.encryptionIvNurse,
        nurseCheckupTimestamp: setTime(today, 8, 30),
        doctorId: doctorUser.id,
        encryptedCondition: historyCompletedTodayEncrypted.encryptedCondition,
        encryptedDescription:
          historyCompletedTodayEncrypted.encryptedDescription,
        encryptedTreatment: historyCompletedTodayEncrypted.encryptedTreatment,
        encryptedDoctorNotes:
          historyCompletedTodayEncrypted.encryptedDoctorNotes,
        encryptionIvDoctor: historyCompletedTodayEncrypted.encryptionIvDoctor,
        dateOfDiagnosis: toDateOnly(today),
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: medicalHistories.id });

    const [historyCompletedYesterday] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientOneUser.id,
        reservationId: reservationCompletedYesterday.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes:
          historyCompletedYesterdayEncrypted.encryptedNurseNotes,
        encryptionIvNurse: historyCompletedYesterdayEncrypted.encryptionIvNurse,
        nurseCheckupTimestamp: setTime(yesterday, 10, 10),
        doctorId: doctorUser.id,
        encryptedCondition:
          historyCompletedYesterdayEncrypted.encryptedCondition,
        encryptedDescription:
          historyCompletedYesterdayEncrypted.encryptedDescription,
        encryptedTreatment:
          historyCompletedYesterdayEncrypted.encryptedTreatment,
        encryptedDoctorNotes:
          historyCompletedYesterdayEncrypted.encryptedDoctorNotes,
        encryptionIvDoctor:
          historyCompletedYesterdayEncrypted.encryptionIvDoctor,
        dateOfDiagnosis: toDateOnly(yesterday),
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      })
      .returning({ id: medicalHistories.id });

    const [historyPatientTwoPast] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientTwoUser.id,
        reservationId: reservationPatientTwoPast.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes: historyPatientTwoPastEncrypted.encryptedNurseNotes,
        encryptionIvNurse: historyPatientTwoPastEncrypted.encryptionIvNurse,
        nurseCheckupTimestamp: addMinutes(patientTwoPastAt, 10),
        doctorId: doctorUser.id,
        encryptedCondition: historyPatientTwoPastEncrypted.encryptedCondition,
        encryptedDescription:
          historyPatientTwoPastEncrypted.encryptedDescription,
        encryptedTreatment: historyPatientTwoPastEncrypted.encryptedTreatment,
        encryptedDoctorNotes:
          historyPatientTwoPastEncrypted.encryptedDoctorNotes,
        encryptionIvDoctor: historyPatientTwoPastEncrypted.encryptionIvDoctor,
        dateOfDiagnosis: toDateOnly(fourDaysAgo),
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      })
      .returning({ id: medicalHistories.id });

    const [historyPatientThreePast] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientThreeUser.id,
        reservationId: reservationPatientThreePast.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes:
          historyPatientThreePastEncrypted.encryptedNurseNotes,
        encryptionIvNurse: historyPatientThreePastEncrypted.encryptionIvNurse,
        nurseCheckupTimestamp: addMinutes(patientThreePastAt, 15),
        doctorId: doctorUser.id,
        encryptedCondition:
          historyPatientThreePastEncrypted.encryptedCondition,
        encryptedDescription:
          historyPatientThreePastEncrypted.encryptedDescription,
        encryptedTreatment:
          historyPatientThreePastEncrypted.encryptedTreatment,
        encryptedDoctorNotes:
          historyPatientThreePastEncrypted.encryptedDoctorNotes,
        encryptionIvDoctor: historyPatientThreePastEncrypted.encryptionIvDoctor,
        dateOfDiagnosis: toDateOnly(fiveDaysAgo),
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      })
      .returning({ id: medicalHistories.id });

    const [historyPatientFourRecent] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientFourUser.id,
        reservationId: reservationPatientFourRecent.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes:
          historyPatientFourRecentEncrypted.encryptedNurseNotes,
        encryptionIvNurse: historyPatientFourRecentEncrypted.encryptionIvNurse,
        nurseCheckupTimestamp: addMinutes(patientFourRecentAt, 12),
        doctorId: doctorUser.id,
        encryptedCondition:
          historyPatientFourRecentEncrypted.encryptedCondition,
        encryptedDescription:
          historyPatientFourRecentEncrypted.encryptedDescription,
        encryptedTreatment:
          historyPatientFourRecentEncrypted.encryptedTreatment,
        encryptedDoctorNotes:
          historyPatientFourRecentEncrypted.encryptedDoctorNotes,
        encryptionIvDoctor: historyPatientFourRecentEncrypted.encryptionIvDoctor,
        dateOfDiagnosis: toDateOnly(threeDaysAgo),
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      })
      .returning({ id: medicalHistories.id });

    const [historyPatientFourOlder] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientFourUser.id,
        reservationId: reservationPatientFourOlder.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes:
          historyPatientFourOlderEncrypted.encryptedNurseNotes,
        encryptionIvNurse: historyPatientFourOlderEncrypted.encryptionIvNurse,
        nurseCheckupTimestamp: addMinutes(patientFourOlderAt, 10),
        doctorId: doctorUser.id,
        encryptedCondition:
          historyPatientFourOlderEncrypted.encryptedCondition,
        encryptedDescription:
          historyPatientFourOlderEncrypted.encryptedDescription,
        encryptedTreatment:
          historyPatientFourOlderEncrypted.encryptedTreatment,
        encryptedDoctorNotes:
          historyPatientFourOlderEncrypted.encryptedDoctorNotes,
        encryptionIvDoctor: historyPatientFourOlderEncrypted.encryptionIvDoctor,
        dateOfDiagnosis: toDateOnly(sevenDaysAgo),
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      })
      .returning({ id: medicalHistories.id });

    const [historyPatientFivePast] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientFiveUser.id,
        reservationId: reservationPatientFivePast.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes:
          historyPatientFivePastEncrypted.encryptedNurseNotes,
        encryptionIvNurse: historyPatientFivePastEncrypted.encryptionIvNurse,
        nurseCheckupTimestamp: addMinutes(patientFivePastAt, 10),
        doctorId: doctorUser.id,
        encryptedCondition:
          historyPatientFivePastEncrypted.encryptedCondition,
        encryptedDescription:
          historyPatientFivePastEncrypted.encryptedDescription,
        encryptedTreatment:
          historyPatientFivePastEncrypted.encryptedTreatment,
        encryptedDoctorNotes:
          historyPatientFivePastEncrypted.encryptedDoctorNotes,
        encryptionIvDoctor: historyPatientFivePastEncrypted.encryptionIvDoctor,
        dateOfDiagnosis: toDateOnly(sixDaysAgo),
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      })
      .returning({ id: medicalHistories.id });

    await tx.insert(medicalHistoryServices).values([
      {
        medicalHistoryId: historyWaitingPayment.id,
        serviceId: consultationService.id,
        quantity: 1,
        notes: "Konsultasi utama",
        createdAt: now,
        updatedAt: now,
      },
      {
        medicalHistoryId: historyWaitingPayment.id,
        serviceId: labService.id,
        quantity: 1,
        notes: "Pemeriksaan darah",
        createdAt: now,
        updatedAt: now,
      },
      {
        medicalHistoryId: historyCompletedToday.id,
        serviceId: consultationService.id,
        quantity: 1,
        notes: "Konsultasi dan evaluasi",
        createdAt: now,
        updatedAt: now,
      },
      {
        medicalHistoryId: historyCompletedYesterday.id,
        serviceId: followUpConsultationService.id,
        quantity: 1,
        notes: "Kontrol alergi musiman",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        medicalHistoryId: historyPatientTwoPast.id,
        serviceId: consultationService.id,
        quantity: 1,
        notes: "Konsultasi nyeri BAK",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        medicalHistoryId: historyPatientTwoPast.id,
        serviceId: urineTestService.id,
        quantity: 1,
        notes: "Urinalisis untuk konfirmasi ISK",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        medicalHistoryId: historyPatientThreePast.id,
        serviceId: followUpConsultationService.id,
        quantity: 1,
        notes: "Evaluasi keluhan lambung",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        medicalHistoryId: historyPatientThreePast.id,
        serviceId: bloodSugarService.id,
        quantity: 1,
        notes: "Skrining gula darah saat kontrol",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        medicalHistoryId: historyPatientFourRecent.id,
        serviceId: consultationService.id,
        quantity: 1,
        notes: "Konsultasi trauma ringan",
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      },
      {
        medicalHistoryId: historyPatientFourRecent.id,
        serviceId: woundCareService.id,
        quantity: 1,
        notes: "Pembersihan dan balut luka",
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      },
      {
        medicalHistoryId: historyPatientFourOlder.id,
        serviceId: consultationService.id,
        quantity: 1,
        notes: "Evaluasi batuk dan mengi",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        medicalHistoryId: historyPatientFourOlder.id,
        serviceId: procedureService.id,
        quantity: 1,
        notes: "Nebulizer untuk bronkospasme ringan",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        medicalHistoryId: historyPatientFivePast.id,
        serviceId: consultationService.id,
        quantity: 1,
        notes: "Evaluasi diare dan lemas",
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
      {
        medicalHistoryId: historyPatientFivePast.id,
        serviceId: vitaminInjectionService.id,
        quantity: 1,
        notes: "Terapi suportif pemulihan",
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
    ]);

    const [
      prescriptionWaitingPayment,
      prescriptionPaidReady,
      prescriptionDone,
      prescriptionPatientTwoPast,
      prescriptionPatientThreePast,
      prescriptionPatientFourOlder,
      prescriptionPatientFivePast,
    ] = await tx
      .insert(prescriptions)
      .values([
        {
          medicalHistoryId: historyWaitingPayment.id,
          paymentStatus: "Unpaid",
          dispenseStatus: "Pending",
          createdAt: now,
          updatedAt: now,
        },
        {
          medicalHistoryId: historyCompletedToday.id,
          paymentStatus: "Paid",
          dispenseStatus: "Pending",
          createdAt: now,
          updatedAt: now,
        },
        {
          medicalHistoryId: historyCompletedYesterday.id,
          paymentStatus: "Paid",
          dispenseStatus: "Dispensed",
          createdAt: addDays(now, -1),
          updatedAt: addDays(now, -1),
        },
        {
          medicalHistoryId: historyPatientTwoPast.id,
          paymentStatus: "Paid",
          dispenseStatus: "Pending",
          createdAt: patientTwoPastAt,
          updatedAt: patientTwoPastAt,
        },
        {
          medicalHistoryId: historyPatientThreePast.id,
          paymentStatus: "Paid",
          dispenseStatus: "Dispensed",
          createdAt: patientThreePastAt,
          updatedAt: patientThreePastAt,
        },
        {
          medicalHistoryId: historyPatientFourOlder.id,
          paymentStatus: "Paid",
          dispenseStatus: "Dispensed",
          createdAt: patientFourOlderAt,
          updatedAt: patientFourOlderAt,
        },
        {
          medicalHistoryId: historyPatientFivePast.id,
          paymentStatus: "Paid",
          dispenseStatus: "Dispensed",
          createdAt: patientFivePastAt,
          updatedAt: patientFivePastAt,
        },
      ])
      .returning({ id: prescriptions.id });

    const prescriptionWaitingPaymentEncrypted = await encryptPrescriptionSeed(
      demoEncryptionKey,
      {
        dosage: "1 tablet",
        frequency: "3x sehari",
        duration: "3 hari",
      }
    );

    const prescriptionPaidReadyEncrypted = await encryptPrescriptionSeed(
      demoEncryptionKey,
      {
        dosage: "1 tablet",
        frequency: "3x sehari",
        duration: "5 hari",
      }
    );

    const prescriptionDoneEncrypted = await encryptPrescriptionSeed(
      demoEncryptionKey,
      {
        dosage: "1 tablet",
        frequency: "1x sehari",
        duration: "5 hari",
      }
    );

    const prescriptionPatientTwoPastEncrypted = await encryptPrescriptionSeed(
      demoEncryptionKey,
      {
        dosage: "1 tablet",
        frequency: "2x sehari",
        duration: "5 hari",
      }
    );

    const prescriptionPatientThreePastEncrypted = await encryptPrescriptionSeed(
      demoEncryptionKey,
      {
        dosage: "1 kapsul",
        frequency: "2x sehari",
        duration: "7 hari",
      }
    );

    const prescriptionPatientFourOlderSyrupEncrypted =
      await encryptPrescriptionSeed(demoEncryptionKey, {
        dosage: "5 ml",
        frequency: "3x sehari",
        duration: "5 hari",
      });

    const prescriptionPatientFourOlderSupportEncrypted =
      await encryptPrescriptionSeed(demoEncryptionKey, {
        dosage: "1 tablet",
        frequency: "1x sehari",
        duration: "6 hari",
      });

    const prescriptionPatientFivePastOralitEncrypted =
      await encryptPrescriptionSeed(demoEncryptionKey, {
        dosage: "1 sachet",
        frequency: "Setelah BAB cair",
        duration: "3 hari",
      });

    const prescriptionPatientFivePastZincEncrypted =
      await encryptPrescriptionSeed(demoEncryptionKey, {
        dosage: "1 tablet",
        frequency: "1x sehari",
        duration: "6 hari",
      });

    await tx.insert(prescriptionMedicines).values([
      {
        prescriptionId: prescriptionWaitingPayment.id,
        medicineId: paracetamol.id,
        stockId: paracetamolStock.id,
        encryptedDosage:
          prescriptionWaitingPaymentEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionWaitingPaymentEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionWaitingPaymentEncrypted.encryptedDuration,
        encryptionIv: prescriptionWaitingPaymentEncrypted.encryptionIv,
        quantityUsed: 9,
        createdAt: now,
        updatedAt: now,
      },
      {
        prescriptionId: prescriptionWaitingPayment.id,
        medicineId: ibuprofen.id,
        stockId: ibuprofenStock.id,
        encryptedDosage: prescriptionWaitingPaymentEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionWaitingPaymentEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionWaitingPaymentEncrypted.encryptedDuration,
        encryptionIv: prescriptionWaitingPaymentEncrypted.encryptionIv,
        quantityUsed: 9,
        createdAt: now,
        updatedAt: now,
      },
      {
        prescriptionId: prescriptionPaidReady.id,
        medicineId: amoxicillin.id,
        stockId: amoxicillinStock.id,
        encryptedDosage: prescriptionPaidReadyEncrypted.encryptedDosage,
        encryptedFrequency: prescriptionPaidReadyEncrypted.encryptedFrequency,
        encryptedDuration: prescriptionPaidReadyEncrypted.encryptedDuration,
        encryptionIv: prescriptionPaidReadyEncrypted.encryptionIv,
        quantityUsed: 15,
        createdAt: now,
        updatedAt: now,
      },
      {
        prescriptionId: prescriptionPaidReady.id,
        medicineId: paracetamol.id,
        stockId: paracetamolStock.id,
        encryptedDosage: prescriptionPaidReadyEncrypted.encryptedDosage,
        encryptedFrequency: prescriptionPaidReadyEncrypted.encryptedFrequency,
        encryptedDuration: prescriptionPaidReadyEncrypted.encryptedDuration,
        encryptionIv: prescriptionPaidReadyEncrypted.encryptionIv,
        quantityUsed: 15,
        createdAt: now,
        updatedAt: now,
      },
      {
        prescriptionId: prescriptionDone.id,
        medicineId: cetirizine.id,
        stockId: cetirizineStock.id,
        encryptedDosage: prescriptionDoneEncrypted.encryptedDosage,
        encryptedFrequency: prescriptionDoneEncrypted.encryptedFrequency,
        encryptedDuration: prescriptionDoneEncrypted.encryptedDuration,
        encryptionIv: prescriptionDoneEncrypted.encryptionIv,
        quantityUsed: 5,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        prescriptionId: prescriptionDone.id,
        medicineId: vitaminC.id,
        stockId: vitaminCStock.id,
        encryptedDosage: prescriptionDoneEncrypted.encryptedDosage,
        encryptedFrequency: prescriptionDoneEncrypted.encryptedFrequency,
        encryptedDuration: prescriptionDoneEncrypted.encryptedDuration,
        encryptionIv: prescriptionDoneEncrypted.encryptionIv,
        quantityUsed: 5,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        prescriptionId: prescriptionPatientTwoPast.id,
        medicineId: amoxicillin.id,
        stockId: amoxicillinStock.id,
        encryptedDosage: prescriptionPatientTwoPastEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientTwoPastEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientTwoPastEncrypted.encryptedDuration,
        encryptionIv: prescriptionPatientTwoPastEncrypted.encryptionIv,
        quantityUsed: 10,
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        prescriptionId: prescriptionPatientTwoPast.id,
        medicineId: ibuprofen.id,
        stockId: ibuprofenStock.id,
        encryptedDosage: prescriptionPatientTwoPastEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientTwoPastEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientTwoPastEncrypted.encryptedDuration,
        encryptionIv: prescriptionPatientTwoPastEncrypted.encryptionIv,
        quantityUsed: 10,
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        prescriptionId: prescriptionPatientThreePast.id,
        medicineId: omeprazole.id,
        stockId: omeprazoleStock.id,
        encryptedDosage:
          prescriptionPatientThreePastEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientThreePastEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientThreePastEncrypted.encryptedDuration,
        encryptionIv: prescriptionPatientThreePastEncrypted.encryptionIv,
        quantityUsed: 14,
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        prescriptionId: prescriptionPatientFourOlder.id,
        medicineId: salbutamol.id,
        stockId: salbutamolStock.id,
        encryptedDosage:
          prescriptionPatientFourOlderSyrupEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientFourOlderSyrupEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientFourOlderSyrupEncrypted.encryptedDuration,
        encryptionIv: prescriptionPatientFourOlderSyrupEncrypted.encryptionIv,
        quantityUsed: 1,
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        prescriptionId: prescriptionPatientFourOlder.id,
        medicineId: vitaminC.id,
        stockId: vitaminCStock.id,
        encryptedDosage:
          prescriptionPatientFourOlderSupportEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientFourOlderSupportEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientFourOlderSupportEncrypted.encryptedDuration,
        encryptionIv:
          prescriptionPatientFourOlderSupportEncrypted.encryptionIv,
        quantityUsed: 6,
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        prescriptionId: prescriptionPatientFivePast.id,
        medicineId: oralit.id,
        stockId: oralitStock.id,
        encryptedDosage:
          prescriptionPatientFivePastOralitEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientFivePastOralitEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientFivePastOralitEncrypted.encryptedDuration,
        encryptionIv:
          prescriptionPatientFivePastOralitEncrypted.encryptionIv,
        quantityUsed: 6,
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
      {
        prescriptionId: prescriptionPatientFivePast.id,
        medicineId: zinc.id,
        stockId: zincStock.id,
        encryptedDosage:
          prescriptionPatientFivePastZincEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientFivePastZincEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientFivePastZincEncrypted.encryptedDuration,
        encryptionIv: prescriptionPatientFivePastZincEncrypted.encryptionIv,
        quantityUsed: 6,
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
    ]);

    // Avoid unused variable warning.
    void expiredVitaminC;
    void expiredSalbutamol;
    void adminFeeService;
    void healthCertificateService;

    const [paymentToday] = await tx
      .insert(payments)
      .values({
        patientId: patientOneUser.id,
        reservationId: reservationCompletedToday.id,
        receptionistId: receptionistUser.id,
        totalAmount: "330000.00",
        paymentDate: now,
        paymentMethod: "Cash",
        status: "Paid",
        prescriptionId: prescriptionPaidReady.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: payments.id });

    const [paymentYesterday] = await tx
      .insert(payments)
      .values({
        patientId: patientOneUser.id,
        reservationId: reservationCompletedYesterday.id,
        receptionistId: receptionistUser.id,
        totalAmount: "135000.00",
        paymentDate: addDays(now, -1),
        paymentMethod: "Transfer",
        status: "Paid",
        prescriptionId: prescriptionDone.id,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      })
      .returning({ id: payments.id });

    const [paymentPatientTwoPast] = await tx
      .insert(payments)
      .values({
        patientId: patientTwoUser.id,
        reservationId: reservationPatientTwoPast.id,
        receptionistId: receptionistUser.id,
        totalAmount: "355000.00",
        paymentDate: patientTwoPastAt,
        paymentMethod: "Debit",
        status: "Paid",
        prescriptionId: prescriptionPatientTwoPast.id,
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      })
      .returning({ id: payments.id });

    const [paymentPatientThreePast] = await tx
      .insert(payments)
      .values({
        patientId: patientThreeUser.id,
        reservationId: reservationPatientThreePast.id,
        receptionistId: receptionistUser.id,
        totalAmount: "276000.00",
        paymentDate: patientThreePastAt,
        paymentMethod: "Credit",
        status: "Paid",
        prescriptionId: prescriptionPatientThreePast.id,
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      })
      .returning({ id: payments.id });

    const [paymentPatientFourRecent] = await tx
      .insert(payments)
      .values({
        patientId: patientFourUser.id,
        reservationId: reservationPatientFourRecent.id,
        receptionistId: receptionistUser.id,
        totalAmount: "285000.00",
        paymentDate: patientFourRecentAt,
        paymentMethod: "BPJS",
        status: "Paid",
        prescriptionId: null,
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      })
      .returning({ id: payments.id });

    const [paymentPatientFourOlder] = await tx
      .insert(payments)
      .values({
        patientId: patientFourUser.id,
        reservationId: reservationPatientFourOlder.id,
        receptionistId: receptionistUser.id,
        totalAmount: "333000.00",
        paymentDate: patientFourOlderAt,
        paymentMethod: "Cash",
        status: "Paid",
        prescriptionId: prescriptionPatientFourOlder.id,
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      })
      .returning({ id: payments.id });

    const [paymentPatientFivePast] = await tx
      .insert(payments)
      .values({
        patientId: patientFiveUser.id,
        reservationId: reservationPatientFivePast.id,
        receptionistId: receptionistUser.id,
        totalAmount: "296000.00",
        paymentDate: patientFivePastAt,
        paymentMethod: "Debit",
        status: "Paid",
        prescriptionId: prescriptionPatientFivePast.id,
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      })
      .returning({ id: payments.id });

    await tx.insert(paymentDetails).values([
      {
        paymentId: paymentToday.id,
        itemType: "Service",
        serviceId: consultationService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "150000.00",
        subtotal: "150000.00",
        notes: "Konsultasi dokter",
        createdAt: now,
        updatedAt: now,
      },
      {
        paymentId: paymentToday.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPaidReady.id,
        quantity: 1,
        unitPrice: "180000.00",
        subtotal: "180000.00",
        notes: "Resep ISPA ringan",
        createdAt: now,
        updatedAt: now,
      },
      {
        paymentId: paymentYesterday.id,
        itemType: "Service",
        serviceId: followUpConsultationService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "100000.00",
        subtotal: "100000.00",
        notes: "Kontrol alergi",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        paymentId: paymentYesterday.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionDone.id,
        quantity: 1,
        unitPrice: "35000.00",
        subtotal: "35000.00",
        notes: "Resep alergi",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        paymentId: paymentPatientTwoPast.id,
        itemType: "Service",
        serviceId: consultationService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "150000.00",
        subtotal: "150000.00",
        notes: "Konsultasi ISK",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        paymentId: paymentPatientTwoPast.id,
        itemType: "Service",
        serviceId: urineTestService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "90000.00",
        subtotal: "90000.00",
        notes: "Urinalisis sederhana",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        paymentId: paymentPatientTwoPast.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPatientTwoPast.id,
        quantity: 1,
        unitPrice: "115000.00",
        subtotal: "115000.00",
        notes: "Resep ISK",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        paymentId: paymentPatientThreePast.id,
        itemType: "Service",
        serviceId: followUpConsultationService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "100000.00",
        subtotal: "100000.00",
        notes: "Kontrol lambung",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        paymentId: paymentPatientThreePast.id,
        itemType: "Service",
        serviceId: bloodSugarService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "85000.00",
        subtotal: "85000.00",
        notes: "Skrining gula darah",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        paymentId: paymentPatientThreePast.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPatientThreePast.id,
        quantity: 1,
        unitPrice: "91000.00",
        subtotal: "91000.00",
        notes: "Resep lambung",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        paymentId: paymentPatientFourRecent.id,
        itemType: "Service",
        serviceId: consultationService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "150000.00",
        subtotal: "150000.00",
        notes: "Konsultasi luka gores",
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      },
      {
        paymentId: paymentPatientFourRecent.id,
        itemType: "Service",
        serviceId: woundCareService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "135000.00",
        subtotal: "135000.00",
        notes: "Perawatan luka ringan",
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      },
      {
        paymentId: paymentPatientFourOlder.id,
        itemType: "Service",
        serviceId: consultationService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "150000.00",
        subtotal: "150000.00",
        notes: "Konsultasi bronkospasme",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        paymentId: paymentPatientFourOlder.id,
        itemType: "Service",
        serviceId: procedureService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "120000.00",
        subtotal: "120000.00",
        notes: "Tindakan nebulizer",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        paymentId: paymentPatientFourOlder.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPatientFourOlder.id,
        quantity: 1,
        unitPrice: "63000.00",
        subtotal: "63000.00",
        notes: "Resep bronkospasme ringan",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        paymentId: paymentPatientFivePast.id,
        itemType: "Service",
        serviceId: consultationService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "150000.00",
        subtotal: "150000.00",
        notes: "Konsultasi diare akut",
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
      {
        paymentId: paymentPatientFivePast.id,
        itemType: "Service",
        serviceId: vitaminInjectionService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "110000.00",
        subtotal: "110000.00",
        notes: "Injeksi vitamin suportif",
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
      {
        paymentId: paymentPatientFivePast.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPatientFivePast.id,
        quantity: 1,
        unitPrice: "36000.00",
        subtotal: "36000.00",
        notes: "Resep rehidrasi dan zinc",
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
    ]);

      await tx.insert(clinicSettings).values({
        clinicName: "Klinik Borneo Kasih",
        address: "Jl. Klinik Sehat No. 123, Banjarmasin",
        phone: "0541-123456",
        email: "info@borneokasih.com",
        morningStart: "08:00",
        morningEnd: "12:00",
        eveningStart: "17:00",
        eveningEnd: "21:00",
        enableStrictCheckIn: false,
        checkInEarlyMinutes: 120,
        checkInLateMinutes: 60,
        enableAutoCancel: true,
        autoCancelGraceMinutes: 1,
        createdAt: now,
        updatedAt: now,
      });
    });

    console.log("Seed completed successfully.");
    console.log("Demo accounts (all passwords are the same):");
    console.log(`- admin@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- doctor@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- nurse@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- receptionist@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- pharmacist@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- patient1@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- patient2@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- patient3@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- patient4@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- patient5@klinik.local / ${TEST_PASSWORD}`);
    console.log(
      "- pending@klinik.local (status Pending, intentionally blocked from login)"
    );
    console.log(
      "- pending2@klinik.local (status Pending, profile sengaja belum lengkap)"
    );
    console.log(
      "- suspended@klinik.local (status Suspended, untuk uji filter/status)"
    );
    console.log(
      "- inactive@klinik.local (status Inactive, untuk uji filter/status)"
    );
    console.log("Seed highlights:");
    console.log("- 10 layanan aktif, 9 obat, 11 batch stok");
    console.log("- 8 riwayat rekam medis tersebar di 5 pasien terverifikasi");
    console.log("- Ada stok low, out-of-stock, dan expired untuk uji resep/farmasi");
    console.log("Reservation timeline (local server time):");
    console.log(`- Waiting: ${waitingAt.toLocaleString("id-ID", { hour12: false })}`);
    console.log(
      `- In Progress: ${inProgressAt.toLocaleString("id-ID", { hour12: false })}`
    );
    console.log(
      `- Waiting for Payment: ${waitingPaymentAt.toLocaleString("id-ID", {
        hour12: false,
      })}`
    );
    console.log(
      `- Completed Today: ${completedTodayAt.toLocaleString("id-ID", {
        hour12: false,
      })}`
    );
    console.log(
      `- Pending Today: ${pendingTodayAt.toLocaleString("id-ID", {
        hour12: false,
      })}`
    );
    console.log(
      `- Pending Tomorrow: ${tomorrowPendingAt.toLocaleString("id-ID", {
        hour12: false,
      })}`
    );
    console.log(
      `- AutoCancel Test Session: ${autoCancelSessionStartAt.toLocaleString(
        "id-ID",
        { hour12: false }
      )} -> ${autoCancelSessionEndAt.toLocaleString("id-ID", {
        hour12: false,
      })}`
    );
    console.log(
      `- AutoCancel Candidate (patient2): ${autoCancelCandidateAt.toLocaleString(
        "id-ID",
        { hour12: false }
      )}`
    );
    console.log(
      `- AutoCancel Expected >= ${autoCancelExpectedAt.toLocaleString("id-ID", {
        hour12: false,
      })} (grace 1 menit)`
    );
    console.log(
      `- No-show Candidate (Yesterday): ${staleNoShowYesterdayAt.toLocaleString(
        "id-ID",
        { hour12: false }
      )}`
    );
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error("Seed failed.");
  console.error(error);
  process.exit(1);
});
