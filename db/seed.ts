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

function addClinicDays(value: Date, days: number): Date {
  const step = days >= 0 ? 1 : -1;
  const result = new Date(value);
  let remaining = Math.abs(days);

  while (remaining > 0) {
    result.setDate(result.getDate() + step);

    if (result.getDay() !== 0) {
      remaining -= 1;
    }
  }

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
    const calendarToday = startOfDay(now);
    const today =
      calendarToday.getDay() === 0 ? addClinicDays(calendarToday, 1) : calendarToday;
    const sevenDaysAgo = addClinicDays(today, -7);
    const sixDaysAgo = addClinicDays(today, -6);
    const yesterday = addClinicDays(today, -1);
    const tomorrow = addClinicDays(today, 1);
    const fiveDaysAgo = addClinicDays(today, -5);
    const fourDaysAgo = addClinicDays(today, -4);
    const threeDaysAgo = addClinicDays(today, -3);

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
        email: "silverius@klinik.local",
        password: passwordHash,
        role: "Doctor",
        status: "Active",
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(doctorDetails).values({
      userId: doctorUser.id,
      name: "dr. Silverius Seantoni Sabella",
      specialization: "Dokter Umum",
      email: "silverius@klinik.local",
      phone: null,
    });

    const [obgynDoctorUser] = await tx
      .insert(users)
      .values({
        email: "ida.bagus@klinik.local",
        password: passwordHash,
        role: "Doctor",
        status: "Active",
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(doctorDetails).values({
      userId: obgynDoctorUser.id,
      name: "dr. Ida Bagus Wicaksana, Sp.OG",
      specialization: "Spesialis Kebidanan dan Penyakit Kandungan",
      email: "ida.bagus@klinik.local",
      phone: null,
    });

    const [dentistDoctorUser] = await tx
      .insert(users)
      .values({
        email: "ida.ayu@klinik.local",
        password: passwordHash,
        role: "Doctor",
        status: "Active",
        createdAt: fiveDaysAgo,
        updatedAt: now,
      })
      .returning({ id: users.id });

    await tx.insert(doctorDetails).values({
      userId: dentistDoctorUser.id,
      name: "drg. Ida Ayu Purniadnyani Pemaron",
      specialization: "Dokter Gigi",
      email: "ida.ayu@klinik.local",
      phone: null,
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

    const [
      obgynMorningSession,
      obgynEveningSession,
      dentistMorningSession,
      dentistEveningSession,
      generalEveningSession,
    ] = await tx
      .insert(practiceSessions)
      .values([
        {
          name: "Kandungan Pagi",
          startTime: new Date("2000-01-01T07:30:00"),
          endTime: new Date("2000-01-01T09:00:00"),
          description: "dr. Ida Bagus Wicaksana, Sp.OG - Senin-Sabtu",
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Kandungan Malam",
          startTime: new Date("2000-01-01T18:30:00"),
          endTime: new Date("2000-01-01T21:00:00"),
          description: "dr. Ida Bagus Wicaksana, Sp.OG - Senin-Sabtu",
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Gigi Pagi",
          startTime: new Date("2000-01-01T09:00:00"),
          endTime: new Date("2000-01-01T12:00:00"),
          description: "drg. Ida Ayu Purniadnyani Pemaron - Senin-Sabtu",
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Gigi Sore",
          startTime: new Date("2000-01-01T17:00:00"),
          endTime: new Date("2000-01-01T20:30:00"),
          description: "drg. Ida Ayu Purniadnyani Pemaron - Senin-Sabtu",
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Umum Sore",
          startTime: new Date("2000-01-01T18:00:00"),
          endTime: new Date("2000-01-01T21:00:00"),
          description: "dr. Silverius Seantoni Sabella - Senin-Sabtu",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning({ id: practiceSessions.id, name: practiceSessions.name });

    const practiceDays = [1, 2, 3, 4, 5, 6];

    const generalDoctorSchedules = await tx
      .insert(doctorSchedules)
      .values(
        practiceDays.map((dayOfWeek) => ({
          doctorId: doctorUser.id,
          sessionId: generalEveningSession.id,
          dayOfWeek,
          maxPatients: 30,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning({
        id: doctorSchedules.id,
        dayOfWeek: doctorSchedules.dayOfWeek,
      });

    const specialtyDoctorSchedules = await tx.insert(doctorSchedules).values([
      ...practiceDays.flatMap((dayOfWeek) => [
        {
          doctorId: obgynDoctorUser.id,
          sessionId: obgynMorningSession.id,
          dayOfWeek,
          maxPatients: 30,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          doctorId: obgynDoctorUser.id,
          sessionId: obgynEveningSession.id,
          dayOfWeek,
          maxPatients: 30,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ]),
      ...practiceDays.flatMap((dayOfWeek) => [
        {
          doctorId: dentistDoctorUser.id,
          sessionId: dentistMorningSession.id,
          dayOfWeek,
          maxPatients: 30,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          doctorId: dentistDoctorUser.id,
          sessionId: dentistEveningSession.id,
          dayOfWeek,
          maxPatients: 30,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    ])
      .returning({
        id: doctorSchedules.id,
        doctorId: doctorSchedules.doctorId,
        sessionId: doctorSchedules.sessionId,
        dayOfWeek: doctorSchedules.dayOfWeek,
      });

    const getRecurringScheduleId = (date: Date) => {
      const scheduleId =
        generalDoctorSchedules.find(
          (schedule) => schedule.dayOfWeek === date.getDay()
        )
          ?.id ?? null;

      if (!scheduleId) {
        throw new Error(
          `Gagal menentukan jadwal dokter umum untuk seed tanggal ${toDateOnly(
            date
          )}`
        );
      }

      return scheduleId;
    };

    const getSpecialtyScheduleId = (
      date: Date,
      doctorId: number,
      sessionId: number
    ) => {
      const scheduleId =
        specialtyDoctorSchedules.find(
          (schedule) =>
            schedule.doctorId === doctorId &&
            schedule.sessionId === sessionId &&
            schedule.dayOfWeek === date.getDay()
        )?.id ?? null;

      if (!scheduleId) {
        throw new Error(
          `Gagal menentukan jadwal dokter spesialis untuk seed tanggal ${toDateOnly(
            date
          )}`
        );
      }

      return scheduleId;
    };

    const todayScheduleId = getRecurringScheduleId(today);
    const tomorrowScheduleId = getRecurringScheduleId(tomorrow);
    const yesterdayScheduleId = getRecurringScheduleId(yesterday);
    const sixDaysAgoScheduleId = getRecurringScheduleId(sixDaysAgo);
    const obgynFourDaysAgoScheduleId = getSpecialtyScheduleId(
      fourDaysAgo,
      obgynDoctorUser.id,
      obgynMorningSession.id
    );
    const obgynFiveDaysAgoScheduleId = getSpecialtyScheduleId(
      fiveDaysAgo,
      obgynDoctorUser.id,
      obgynEveningSession.id
    );
    const dentistThreeDaysAgoScheduleId = getSpecialtyScheduleId(
      threeDaysAgo,
      dentistDoctorUser.id,
      dentistMorningSession.id
    );
    const dentistSevenDaysAgoScheduleId = getSpecialtyScheduleId(
      sevenDaysAgo,
      dentistDoctorUser.id,
      dentistEveningSession.id
    );

    await tx.insert(dailyScheduleStatuses).values([
      {
        scheduleId: todayScheduleId,
        date: toDateOnly(today),
        isActive: true,
        currentReservations: 7,
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
        scheduleId: yesterdayScheduleId,
        date: toDateOnly(yesterday),
        isActive: true,
        currentReservations: 2,
        notes: "Seed kemarin (dinamis)",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: obgynFourDaysAgoScheduleId,
        date: toDateOnly(fourDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed kandungan - USG 2D",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: obgynFiveDaysAgoScheduleId,
        date: toDateOnly(fiveDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed kandungan - ginekologi",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: dentistThreeDaysAgoScheduleId,
        date: toDateOnly(threeDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed dokter gigi - periksa gigi",
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
        scheduleId: dentistSevenDaysAgoScheduleId,
        date: toDateOnly(sevenDaysAgo),
        isActive: true,
        currentReservations: 1,
        notes: "Seed dokter gigi - scalling",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const serviceSeedRows = [
      {
        key: "obgynUsg2dConsultation",
        name: "USG 2D + Konsultasi",
        description: "Paket USG 2D termasuk konsultasi dokter kandungan",
        basePrice: "150000.00",
        category: "Pemeriksaan",
        doctorId: obgynDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "obgynUsg4dConsultation",
        name: "USG 4D + Konsultasi",
        description: "Paket USG 4D termasuk konsultasi dokter kandungan",
        basePrice: "250000.00",
        category: "Pemeriksaan",
        doctorId: obgynDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "obgynGynecologyConsultation",
        name: "Pemeriksaan Ginekologi + Konsultasi",
        description: "Pemeriksaan ginekologi termasuk konsultasi dokter kandungan",
        basePrice: "200000.00",
        category: "Pemeriksaan",
        doctorId: obgynDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "dentistChildExtractionMin",
        name: "Cabut Gigi Anak + Konsultasi (Tarif Minimum)",
        description: "Batas bawah tarif cabut gigi anak termasuk konsultasi",
        basePrice: "100000.00",
        category: "Tindakan",
        doctorId: dentistDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "dentistChildExtractionMax",
        name: "Cabut Gigi Anak + Konsultasi (Tarif Maksimum)",
        description: "Batas atas tarif cabut gigi anak termasuk konsultasi",
        basePrice: "150000.00",
        category: "Tindakan",
        doctorId: dentistDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "dentistAdultExtractionMin",
        name: "Cabut Gigi Dewasa + Konsultasi (Tarif Minimum)",
        description: "Batas bawah tarif cabut gigi dewasa termasuk konsultasi",
        basePrice: "300000.00",
        category: "Tindakan",
        doctorId: dentistDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "dentistAdultExtractionMax",
        name: "Cabut Gigi Dewasa + Konsultasi (Tarif Maksimum)",
        description: "Batas atas tarif cabut gigi dewasa termasuk konsultasi",
        basePrice: "400000.00",
        category: "Tindakan",
        doctorId: dentistDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "dentistScalingMin",
        name: "Scalling + Konsultasi (Tarif Minimum)",
        description: "Batas bawah tarif scalling termasuk konsultasi dokter gigi",
        basePrice: "300000.00",
        category: "Tindakan",
        doctorId: dentistDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "dentistScalingMax",
        name: "Scalling + Konsultasi (Tarif Maksimum)",
        description: "Batas atas tarif scalling termasuk konsultasi dokter gigi",
        basePrice: "400000.00",
        category: "Tindakan",
        doctorId: dentistDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "dentistDentalCheckupConsultation",
        name: "Periksa Gigi + Konsultasi",
        description: "Pemeriksaan gigi termasuk konsultasi dokter gigi",
        basePrice: "150000.00",
        category: "Pemeriksaan",
        doctorId: dentistDoctorUser.id,
        isDoctorDefault: false,
      },
      {
        key: "generalConsultation",
        name: "Konsultasi",
        description: "Konsultasi dokter umum",
        basePrice: "60000.00",
        category: "Konsultasi",
        doctorId: doctorUser.id,
        isDoctorDefault: true,
      },
      {
        key: "generalVitaminInjectionConsultation",
        name: "Konsultasi + Injeksi Vitamin",
        description: "Konsultasi dokter umum dengan tindakan injeksi vitamin",
        basePrice: "120000.00",
        category: "Tindakan",
        doctorId: doctorUser.id,
        isDoctorDefault: false,
      },
    ] as const;

    const insertedServiceRows = await tx
      .insert(serviceCatalog)
      .values(
        serviceSeedRows.map(({ key, ...service }) => ({
          ...service,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning({ id: serviceCatalog.id, name: serviceCatalog.name });

    const serviceByKey = Object.fromEntries(
      insertedServiceRows.map((service, index) => [
        serviceSeedRows[index].key,
        service,
      ])
    ) as Record<
      (typeof serviceSeedRows)[number]["key"],
      { id: number; name: string }
    >;

    const medicineSeedRows = [
      {
        key: "biocalKandungan",
        name: "Biocal",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "9000.00",
        batchPrefix: "KAND-BIOCAL",
        quantity: 120,
        remainingQuantity: 96,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "cal95Kandungan",
        name: "Cal-95",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "10000.00",
        batchPrefix: "KAND-CAL95",
        quantity: 100,
        remainingQuantity: 74,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "folaplusKandungan",
        name: "Folaplus",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "2000.00",
        batchPrefix: "KAND-FOLAPLUS",
        quantity: 180,
        remainingQuantity: 132,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 30,
      },
      {
        key: "amvarKandungan",
        name: "Amvar",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "15000.00",
        batchPrefix: "KAND-AMVAR",
        quantity: 90,
        remainingQuantity: 62,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 15,
      },
      {
        key: "hbVitKandungan",
        name: "Hb Vit",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "6000.00",
        batchPrefix: "KAND-HBVIT",
        quantity: 120,
        remainingQuantity: 84,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 20,
      },
      {
        key: "hyFolicKandungan",
        name: "Hy Folic",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "7000.00",
        batchPrefix: "KAND-HYFOLIC",
        quantity: 40,
        remainingQuantity: 8,
        expiryDate: toDateOnly(expiryIn30Days),
        minimumStock: 15,
      },
      {
        key: "dopametKandungan",
        name: "Dopamet",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "5000.00",
        batchPrefix: "KAND-DOPAMET",
        quantity: 100,
        remainingQuantity: 72,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 15,
      },
      {
        key: "busminKandungan",
        name: "Busmin",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "10000.00",
        batchPrefix: "KAND-BUSMIN",
        quantity: 80,
        remainingQuantity: 64,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 15,
      },
      {
        key: "maxcefKandungan",
        name: "Maxcef",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "16000.00",
        batchPrefix: "KAND-MAXCEF",
        quantity: 80,
        remainingQuantity: 58,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 15,
      },
      {
        key: "meprolutKandungan",
        name: "Meprolut",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "6000.00",
        batchPrefix: "KAND-MEPROLUT",
        quantity: 100,
        remainingQuantity: 70,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 15,
      },
      {
        key: "maxcef500Kandungan",
        name: "Maxcef 500 mg",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "16000.00",
        batchPrefix: "KAND-MAXCEF500",
        quantity: 80,
        remainingQuantity: 52,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 15,
      },
      {
        key: "maxmilKandungan",
        name: "Maxmil",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "8000.00",
        batchPrefix: "KAND-MAXMIL",
        quantity: 100,
        remainingQuantity: 76,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "maxtusifSyrupKandungan",
        name: "Maxtusif Syrup",
        category: "Poli Kandungan",
        dosageForm: "Sirup",
        unit: "botol",
        price: "105000.00",
        batchPrefix: "KAND-MAXTUSIF",
        quantity: 18,
        remainingQuantity: 5,
        expiryDate: toDateOnly(expiryIn30Days),
        minimumStock: 5,
      },
      {
        key: "progestonKandungan",
        name: "Progeston",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "5500.00",
        batchPrefix: "KAND-PROGESTON",
        quantity: 120,
        remainingQuantity: 88,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "provomerKandungan",
        name: "Provomer",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "4000.00",
        batchPrefix: "KAND-PROVOMER",
        quantity: 100,
        remainingQuantity: 66,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "tranecKandungan",
        name: "Tranec",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "6000.00",
        batchPrefix: "KAND-TRANEC",
        quantity: 90,
        remainingQuantity: 54,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 15,
      },
      {
        key: "lactamamKandungan",
        name: "Lactamam",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "5000.00",
        batchPrefix: "KAND-LACTAMAM",
        quantity: 100,
        remainingQuantity: 78,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "provarginOvulaKandungan",
        name: "Provargin Ovula",
        category: "Poli Kandungan",
        dosageForm: "Ovula",
        unit: "sup",
        price: "20000.00",
        batchPrefix: "KAND-PROVARGIN",
        quantity: 40,
        remainingQuantity: 18,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 8,
      },
      {
        key: "ondansentron8Kandungan",
        name: "Ondansentron 8 mg",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "5000.00",
        batchPrefix: "KAND-ONDAN8",
        quantity: 100,
        remainingQuantity: 68,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "microges100Kandungan",
        name: "Microges 100 mg",
        category: "Poli Kandungan",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "18000.00",
        batchPrefix: "KAND-MICROGES100",
        quantity: 60,
        remainingQuantity: 34,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 10,
      },
      {
        key: "clinjosGigi",
        name: "Clinjos",
        category: "Poli Gigi",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "10000.00",
        batchPrefix: "GIGI-CLINJOS",
        quantity: 80,
        remainingQuantity: 42,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 15,
      },
      {
        key: "orinoxGigi",
        name: "Orinox",
        category: "Poli Gigi",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "11000.00",
        batchPrefix: "GIGI-ORINOX",
        quantity: 80,
        remainingQuantity: 46,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 15,
      },
      {
        key: "mefix500Gigi",
        name: "Mefix 500 mg",
        category: "Poli Gigi",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "2000.00",
        batchPrefix: "GIGI-MEFIX500",
        quantity: 120,
        remainingQuantity: 86,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "simfamplasGigi",
        name: "Simfamplas",
        category: "Poli Gigi",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "5000.00",
        batchPrefix: "GIGI-SIMFAMPLAS",
        quantity: 100,
        remainingQuantity: 58,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "supramox500Gigi",
        name: "Supramox 500 mg",
        category: "Poli Gigi",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "4000.00",
        batchPrefix: "GIGI-SUPRAMOX500",
        quantity: 120,
        remainingQuantity: 90,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "pyrexinGigi",
        name: "Pyrexin",
        category: "Poli Gigi",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "1000.00",
        batchPrefix: "GIGI-PYREXIN",
        quantity: 150,
        remainingQuantity: 112,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 30,
      },
      {
        key: "turpasParacetamolSyrupGigi",
        name: "Turpas Paracetamol Syrup",
        category: "Poli Gigi",
        dosageForm: "Sirup",
        unit: "botol",
        price: "50000.00",
        batchPrefix: "GIGI-TURPAS",
        quantity: 10,
        remainingQuantity: 2,
        expiryDate: toDateOnly(expiryIn30Days),
        minimumStock: 5,
      },
      {
        key: "maxcef500Umum",
        name: "Maxcef 500 mg",
        category: "Poli Umum",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "16000.00",
        batchPrefix: "UMUM-MAXCEF500",
        quantity: 100,
        remainingQuantity: 70,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 20,
      },
      {
        key: "maxtusifSyrupUmum",
        name: "Maxtusif Syrup",
        category: "Poli Umum",
        dosageForm: "Sirup",
        unit: "botol",
        price: "105000.00",
        batchPrefix: "UMUM-MAXTUSIF",
        quantity: 20,
        remainingQuantity: 12,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 5,
      },
      {
        key: "lameson8Umum",
        name: "Lameson 8 mg",
        category: "Poli Umum",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "11000.00",
        batchPrefix: "UMUM-LAMESON8",
        quantity: 100,
        remainingQuantity: 78,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "ondansentron8Umum",
        name: "Ondansentron 8 mg",
        category: "Poli Umum",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "5000.00",
        batchPrefix: "UMUM-ONDAN8",
        quantity: 100,
        remainingQuantity: 64,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "simprofenUmum",
        name: "Simprofen",
        category: "Poli Umum",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "10000.00",
        batchPrefix: "UMUM-SIMPROFEN",
        quantity: 100,
        remainingQuantity: 60,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 20,
      },
      {
        key: "amlodipin10Umum",
        name: "Amlodipin 10 mg",
        category: "Poli Umum",
        dosageForm: "Tablet",
        unit: "strip",
        price: "20000.00",
        batchPrefix: "UMUM-AMLODIPIN10",
        quantity: 40,
        remainingQuantity: 16,
        expiryDate: toDateOnly(expiryIn90Days),
        minimumStock: 8,
      },
      {
        key: "ranitidine150Umum",
        name: "Ranitidine 150 mg",
        category: "Poli Umum",
        dosageForm: "Tablet",
        unit: "tablet",
        price: "20000.00",
        batchPrefix: "UMUM-RANITIDINE150",
        quantity: 30,
        remainingQuantity: 0,
        expiryDate: toDateOnly(expiryIn180Days),
        minimumStock: 10,
      },
    ] as const;

    const insertedMedicineRows = await tx
      .insert(medicines)
      .values(
        medicineSeedRows.map(({ key, batchPrefix, quantity, remainingQuantity, expiryDate, ...medicine }) => ({
          ...medicine,
          description: `${medicine.name} - ${medicine.category}`,
          pharmacistId: pharmacistUser.id,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning({ id: medicines.id, name: medicines.name });

    const medicineByKey = Object.fromEntries(
      insertedMedicineRows.map((medicine, index) => [
        medicineSeedRows[index].key,
        medicine,
      ])
    ) as Record<
      (typeof medicineSeedRows)[number]["key"],
      { id: number; name: string }
    >;

    const insertedPrimaryStockRows = await tx
      .insert(medicineStocks)
      .values(
        medicineSeedRows.map((medicine, index) => ({
          medicineId: medicineByKey[medicine.key].id,
          batchNumber: `${medicine.batchPrefix}-${String(index + 1).padStart(
            3,
            "0"
          )}`,
          quantity: medicine.quantity,
          remainingQuantity: medicine.remainingQuantity,
          expiryDate: medicine.expiryDate,
          supplier: "Supplier klinik",
          purchasePrice: null,
          addedAt: addDays(today, -30),
          isBelowThreshold: medicine.remainingQuantity <= medicine.minimumStock,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning({
        id: medicineStocks.id,
        batchNumber: medicineStocks.batchNumber,
      });

    const stockByKey = Object.fromEntries(
      insertedPrimaryStockRows.map((stock, index) => [
        medicineSeedRows[index].key,
        stock,
      ])
    ) as Record<
      (typeof medicineSeedRows)[number]["key"],
      { id: number; batchNumber: string }
    >;

    await tx.insert(medicineStocks).values([
      {
        medicineId: medicineByKey.maxtusifSyrupKandungan.id,
        batchNumber: "KAND-MAXTUSIF-EXP-001",
        quantity: 4,
        remainingQuantity: 1,
        expiryDate: toDateOnly(expired5DaysAgo),
        supplier: "Supplier klinik",
        purchasePrice: null,
        addedAt: addDays(today, -90),
        isBelowThreshold: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        medicineId: medicineByKey.clinjosGigi.id,
        batchNumber: "GIGI-CLINJOS-EXP-001",
        quantity: 20,
        remainingQuantity: 4,
        expiryDate: toDateOnly(expired5DaysAgo),
        supplier: "Supplier klinik",
        purchasePrice: null,
        addedAt: addDays(today, -90),
        isBelowThreshold: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

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
        scheduleId: todayScheduleId,
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
        doctorId: obgynDoctorUser.id,
        scheduleId: obgynFourDaysAgoScheduleId,
        reservationDate: patientTwoPastAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Kontrol kehamilan dan pemeriksaan USG 2D",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      })
      .returning({ id: reservations.id });

    const [reservationPatientThreePast] = await tx
      .insert(reservations)
      .values({
        patientId: patientThreeUser.id,
        doctorId: obgynDoctorUser.id,
        scheduleId: obgynFiveDaysAgoScheduleId,
        reservationDate: patientThreePastAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Keluhan ginekologi dan pemeriksaan lanjutan",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      })
      .returning({ id: reservations.id });

    const [reservationPatientFourRecent] = await tx
      .insert(reservations)
      .values({
        patientId: patientFourUser.id,
        doctorId: dentistDoctorUser.id,
        scheduleId: dentistThreeDaysAgoScheduleId,
        reservationDate: patientFourRecentAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Pemeriksaan gigi rutin",
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      })
      .returning({ id: reservations.id });

    const [reservationPatientFourOlder] = await tx
      .insert(reservations)
      .values({
        patientId: patientFourUser.id,
        doctorId: dentistDoctorUser.id,
        scheduleId: dentistSevenDaysAgoScheduleId,
        reservationDate: patientFourOlderAt,
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Pembersihan karang gigi",
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
        nurseNotes: "Tekanan darah 120/80, suhu 37.3C, keluhan mual ringan",
        condition: "Keluhan umum ringan",
        description: "Pasien datang untuk konsultasi dokter umum dengan keluhan tidak enak badan",
        treatment: "Konsultasi, edukasi istirahat, dan terapi simptomatik",
        doctorNotes: "Kontrol kembali bila keluhan menetap atau memberat",
      }
    );

    const historyCompletedTodayEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Suhu 37.8C, badan lemas, nafsu makan menurun",
        condition: "Keluhan lemas dan flu ringan",
        description: "Pasien datang untuk konsultasi dokter umum dan tindakan injeksi vitamin",
        treatment: "Konsultasi, injeksi vitamin, dan obat simptomatik",
        doctorNotes: "Anjurkan istirahat cukup dan hidrasi",
      }
    );

    const historyCompletedYesterdayEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Tekanan darah 118/78, suhu normal, mual berkurang",
        condition: "Kontrol keluhan mual",
        description: "Pasien kontrol setelah keluhan mual dan tidak enak badan",
        treatment: "Konsultasi dokter umum dan obat sesuai keluhan",
        doctorNotes: "Lanjutkan obat bila perlu dan kembali bila keluhan berulang",
      }
    );

    const historyPatientTwoPastEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Pasien kontrol kehamilan, tanda vital stabil",
        condition: "Kontrol kehamilan",
        description: "Pemeriksaan USG 2D dan konsultasi dokter kandungan",
        treatment: "USG 2D, konsultasi, dan vitamin sesuai kebutuhan",
        doctorNotes: "Kontrol sesuai jadwal dan pantau keluhan selama kehamilan",
      }
    );

    const historyPatientThreePastEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Pasien datang dengan keluhan ginekologi, tanda vital stabil",
        condition: "Keluhan ginekologi",
        description: "Pemeriksaan ginekologi dan konsultasi dokter kandungan",
        treatment: "Pemeriksaan ginekologi, konsultasi, dan terapi sesuai keluhan",
        doctorNotes: "Kontrol ulang bila keluhan menetap",
      }
    );

    const historyPatientFourRecentEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Keluhan gigi ringan, tidak ada pembengkakan wajah",
        condition: "Pemeriksaan gigi",
        description: "Periksa gigi dan konsultasi dokter gigi",
        treatment: "Pemeriksaan gigi, edukasi kebersihan mulut, dan obat bila perlu",
        doctorNotes: "Kontrol bila nyeri atau bengkak muncul",
      }
    );

    const historyPatientFourOlderEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Karang gigi tampak, keluhan gusi mudah berdarah",
        condition: "Karang gigi",
        description: "Scalling dan konsultasi dokter gigi",
        treatment: "Scalling, edukasi kebersihan gigi, dan obat sesuai keluhan",
        doctorNotes: "Anjurkan kontrol rutin dan sikat gigi teratur",
      }
    );

    const historyPatientFivePastEncrypted = await encryptMedicalHistorySeed(
      demoEncryptionKey,
      {
        nurseNotes: "Badan lemas, tekanan darah stabil, suhu normal",
        condition: "Keluhan lemas",
        description: "Konsultasi dokter umum dengan tindakan injeksi vitamin",
        treatment: "Konsultasi, injeksi vitamin, dan terapi suportif",
        doctorNotes: "Istirahat cukup dan kembali bila keluhan tidak membaik",
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
        doctorId: obgynDoctorUser.id,
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
        doctorId: obgynDoctorUser.id,
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
        doctorId: dentistDoctorUser.id,
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
        doctorId: dentistDoctorUser.id,
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
        serviceId: serviceByKey.generalConsultation.id,
        quantity: 1,
        notes: "Konsultasi dokter umum",
        createdAt: now,
        updatedAt: now,
      },
      {
        medicalHistoryId: historyCompletedToday.id,
        serviceId: serviceByKey.generalVitaminInjectionConsultation.id,
        quantity: 1,
        notes: "Paket konsultasi dan injeksi vitamin",
        createdAt: now,
        updatedAt: now,
      },
      {
        medicalHistoryId: historyCompletedYesterday.id,
        serviceId: serviceByKey.generalConsultation.id,
        quantity: 1,
        notes: "Konsultasi dokter umum",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        medicalHistoryId: historyPatientTwoPast.id,
        serviceId: serviceByKey.obgynUsg2dConsultation.id,
        quantity: 1,
        notes: "USG 2D termasuk konsultasi",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        medicalHistoryId: historyPatientThreePast.id,
        serviceId: serviceByKey.obgynGynecologyConsultation.id,
        quantity: 1,
        notes: "Pemeriksaan ginekologi termasuk konsultasi",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        medicalHistoryId: historyPatientFourRecent.id,
        serviceId: serviceByKey.dentistDentalCheckupConsultation.id,
        quantity: 1,
        notes: "Periksa gigi termasuk konsultasi",
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      },
      {
        medicalHistoryId: historyPatientFourOlder.id,
        serviceId: serviceByKey.dentistScalingMin.id,
        quantity: 1,
        notes: "Scalling termasuk konsultasi tarif minimum",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        medicalHistoryId: historyPatientFivePast.id,
        serviceId: serviceByKey.generalVitaminInjectionConsultation.id,
        quantity: 1,
        notes: "Paket konsultasi dan injeksi vitamin",
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

    const prescriptionPatientFivePastLamesonEncrypted =
      await encryptPrescriptionSeed(demoEncryptionKey, {
        dosage: "1 tablet",
        frequency: "2x sehari",
        duration: "3 hari",
      });

    const prescriptionPatientFivePastSimprofenEncrypted =
      await encryptPrescriptionSeed(demoEncryptionKey, {
        dosage: "1 tablet",
        frequency: "1x sehari",
        duration: "6 hari",
      });

    await tx.insert(prescriptionMedicines).values([
      {
        prescriptionId: prescriptionWaitingPayment.id,
        medicineId: medicineByKey.ondansentron8Umum.id,
        stockId: stockByKey.ondansentron8Umum.id,
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
        medicineId: medicineByKey.simprofenUmum.id,
        stockId: stockByKey.simprofenUmum.id,
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
        medicineId: medicineByKey.maxcef500Umum.id,
        stockId: stockByKey.maxcef500Umum.id,
        encryptedDosage: prescriptionPaidReadyEncrypted.encryptedDosage,
        encryptedFrequency: prescriptionPaidReadyEncrypted.encryptedFrequency,
        encryptedDuration: prescriptionPaidReadyEncrypted.encryptedDuration,
        encryptionIv: prescriptionPaidReadyEncrypted.encryptionIv,
        quantityUsed: 10,
        createdAt: now,
        updatedAt: now,
      },
      {
        prescriptionId: prescriptionPaidReady.id,
        medicineId: medicineByKey.maxtusifSyrupUmum.id,
        stockId: stockByKey.maxtusifSyrupUmum.id,
        encryptedDosage: prescriptionPaidReadyEncrypted.encryptedDosage,
        encryptedFrequency: prescriptionPaidReadyEncrypted.encryptedFrequency,
        encryptedDuration: prescriptionPaidReadyEncrypted.encryptedDuration,
        encryptionIv: prescriptionPaidReadyEncrypted.encryptionIv,
        quantityUsed: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        prescriptionId: prescriptionDone.id,
        medicineId: medicineByKey.lameson8Umum.id,
        stockId: stockByKey.lameson8Umum.id,
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
        medicineId: medicineByKey.ondansentron8Umum.id,
        stockId: stockByKey.ondansentron8Umum.id,
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
        medicineId: medicineByKey.folaplusKandungan.id,
        stockId: stockByKey.folaplusKandungan.id,
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
        medicineId: medicineByKey.cal95Kandungan.id,
        stockId: stockByKey.cal95Kandungan.id,
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
        medicineId: medicineByKey.provomerKandungan.id,
        stockId: stockByKey.provomerKandungan.id,
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
        medicineId: medicineByKey.clinjosGigi.id,
        stockId: stockByKey.clinjosGigi.id,
        encryptedDosage:
          prescriptionPatientFourOlderSyrupEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientFourOlderSyrupEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientFourOlderSyrupEncrypted.encryptedDuration,
        encryptionIv: prescriptionPatientFourOlderSyrupEncrypted.encryptionIv,
        quantityUsed: 10,
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        prescriptionId: prescriptionPatientFourOlder.id,
        medicineId: medicineByKey.pyrexinGigi.id,
        stockId: stockByKey.pyrexinGigi.id,
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
        medicineId: medicineByKey.lameson8Umum.id,
        stockId: stockByKey.lameson8Umum.id,
        encryptedDosage:
          prescriptionPatientFivePastLamesonEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientFivePastLamesonEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientFivePastLamesonEncrypted.encryptedDuration,
        encryptionIv:
          prescriptionPatientFivePastLamesonEncrypted.encryptionIv,
        quantityUsed: 6,
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
      {
        prescriptionId: prescriptionPatientFivePast.id,
        medicineId: medicineByKey.simprofenUmum.id,
        stockId: stockByKey.simprofenUmum.id,
        encryptedDosage:
          prescriptionPatientFivePastSimprofenEncrypted.encryptedDosage,
        encryptedFrequency:
          prescriptionPatientFivePastSimprofenEncrypted.encryptedFrequency,
        encryptedDuration:
          prescriptionPatientFivePastSimprofenEncrypted.encryptedDuration,
        encryptionIv: prescriptionPatientFivePastSimprofenEncrypted.encryptionIv,
        quantityUsed: 6,
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
    ]);

    const [paymentToday] = await tx
      .insert(payments)
      .values({
        patientId: patientOneUser.id,
        reservationId: reservationCompletedToday.id,
        receptionistId: receptionistUser.id,
        totalAmount: "385000.00",
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
        totalAmount: "140000.00",
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
        totalAmount: "270000.00",
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
        totalAmount: "256000.00",
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
        totalAmount: "150000.00",
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
        totalAmount: "406000.00",
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
        totalAmount: "246000.00",
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
        serviceId: serviceByKey.generalVitaminInjectionConsultation.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "120000.00",
        subtotal: "120000.00",
        notes: "Konsultasi + injeksi vitamin",
        createdAt: now,
        updatedAt: now,
      },
      {
        paymentId: paymentToday.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPaidReady.id,
        quantity: 1,
        unitPrice: "265000.00",
        subtotal: "265000.00",
        notes: "Resep dokter umum",
        createdAt: now,
        updatedAt: now,
      },
      {
        paymentId: paymentYesterday.id,
        itemType: "Service",
        serviceId: serviceByKey.generalConsultation.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "60000.00",
        subtotal: "60000.00",
        notes: "Konsultasi dokter umum",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        paymentId: paymentYesterday.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionDone.id,
        quantity: 1,
        unitPrice: "80000.00",
        subtotal: "80000.00",
        notes: "Resep dokter umum",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        paymentId: paymentPatientTwoPast.id,
        itemType: "Service",
        serviceId: serviceByKey.obgynUsg2dConsultation.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "150000.00",
        subtotal: "150000.00",
        notes: "USG 2D + konsultasi",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        paymentId: paymentPatientTwoPast.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPatientTwoPast.id,
        quantity: 1,
        unitPrice: "120000.00",
        subtotal: "120000.00",
        notes: "Resep poli kandungan",
        createdAt: patientTwoPastAt,
        updatedAt: patientTwoPastAt,
      },
      {
        paymentId: paymentPatientThreePast.id,
        itemType: "Service",
        serviceId: serviceByKey.obgynGynecologyConsultation.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "200000.00",
        subtotal: "200000.00",
        notes: "Pemeriksaan ginekologi + konsultasi",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        paymentId: paymentPatientThreePast.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPatientThreePast.id,
        quantity: 1,
        unitPrice: "56000.00",
        subtotal: "56000.00",
        notes: "Resep poli kandungan",
        createdAt: patientThreePastAt,
        updatedAt: patientThreePastAt,
      },
      {
        paymentId: paymentPatientFourRecent.id,
        itemType: "Service",
        serviceId: serviceByKey.dentistDentalCheckupConsultation.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "150000.00",
        subtotal: "150000.00",
        notes: "Periksa gigi + konsultasi",
        createdAt: patientFourRecentAt,
        updatedAt: patientFourRecentAt,
      },
      {
        paymentId: paymentPatientFourOlder.id,
        itemType: "Service",
        serviceId: serviceByKey.dentistScalingMin.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "300000.00",
        subtotal: "300000.00",
        notes: "Scalling + konsultasi tarif minimum",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        paymentId: paymentPatientFourOlder.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPatientFourOlder.id,
        quantity: 1,
        unitPrice: "106000.00",
        subtotal: "106000.00",
        notes: "Resep poli gigi",
        createdAt: patientFourOlderAt,
        updatedAt: patientFourOlderAt,
      },
      {
        paymentId: paymentPatientFivePast.id,
        itemType: "Service",
        serviceId: serviceByKey.generalVitaminInjectionConsultation.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "120000.00",
        subtotal: "120000.00",
        notes: "Konsultasi + injeksi vitamin",
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
      {
        paymentId: paymentPatientFivePast.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionPatientFivePast.id,
        quantity: 1,
        unitPrice: "126000.00",
        subtotal: "126000.00",
        notes: "Resep dokter umum",
        createdAt: patientFivePastAt,
        updatedAt: patientFivePastAt,
      },
    ]);

      await tx.insert(clinicSettings).values({
        clinicName: "Klinik Praktik Dokter",
        address:
          "Jl. RTA Milono No.KM. 1,5, Langkai, Kec. Pahandut, Kota Palangka Raya, Kalimantan Tengah 73111",
        phone: "-",
        email: "klinik@local.test",
        morningStart: "07:30",
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
    console.log(`- silverius@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- ida.bagus@klinik.local / ${TEST_PASSWORD}`);
    console.log(`- ida.ayu@klinik.local / ${TEST_PASSWORD}`);
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
    console.log("- 3 dokter real dengan jadwal Senin-Sabtu");
    console.log("- 12 layanan real, 34 obat real, 36 batch stok seed");
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
      `- Auto-cancel window: ${autoCancelSessionStartAt.toLocaleString(
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
      `- No-show Candidate (previous clinic day): ${staleNoShowYesterdayAt.toLocaleString(
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
