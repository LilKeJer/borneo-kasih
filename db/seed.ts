import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as dotenv from "dotenv";
import * as bcrypt from "bcrypt";
import { Pool } from "pg";
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

function setTime(value: Date, hours: number, minutes: number): Date {
  const result = new Date(value);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);
    const fiveDaysAgo = addDays(today, -5);

    const expiryIn30Days = addDays(today, 30);
    const expiryIn90Days = addDays(today, 90);
    const expiryIn180Days = addDays(today, 180);
    const expired5DaysAgo = addDays(today, -5);

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

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
        username: "admin",
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
        username: "doctor",
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
        username: "nurse",
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
        username: "receptionist",
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
        username: "pharmacist",
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
        username: "patient1",
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
        username: "patient2",
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
        username: "patient3",
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
        username: "patient_pending",
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

    const [morningSession, afternoonSession, standbySession] = await tx
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
    const tomorrowDay = tomorrow.getDay();
    const yesterdayDay = yesterday.getDay();

    const todayScheduleId =
      allDaySchedules.find((schedule) => schedule.dayOfWeek === currentDay)
        ?.id ?? null;
    const tomorrowScheduleId =
      allDaySchedules.find((schedule) => schedule.dayOfWeek === tomorrowDay)
        ?.id ?? null;
    const yesterdayScheduleId =
      allDaySchedules.find((schedule) => schedule.dayOfWeek === yesterdayDay)
        ?.id ?? null;

    if (!todayScheduleId || !tomorrowScheduleId || !yesterdayScheduleId) {
      throw new Error("Gagal menentukan schedule harian untuk seed");
    }

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

    await tx.insert(dailyScheduleStatuses).values([
      {
        scheduleId: todayScheduleId,
        date: toDateOnly(today),
        isActive: true,
        currentReservations: 4,
        notes: "Seed hari ini",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: tomorrowScheduleId,
        date: toDateOnly(tomorrow),
        isActive: true,
        currentReservations: 1,
        notes: "Seed besok",
        createdAt: now,
        updatedAt: now,
      },
      {
        scheduleId: yesterdayScheduleId,
        date: toDateOnly(yesterday),
        isActive: true,
        currentReservations: 1,
        notes: "Seed kemarin",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const [
      consultationService,
      labService,
      procedureService,
      adminFeeService,
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
          name: "Tes Darah Lengkap",
          description: "Pemeriksaan laboratorium dasar",
          basePrice: "200000.00",
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
          name: "Biaya Administrasi",
          description: "Biaya layanan tambahan",
          basePrice: "25000.00",
          category: "Lainnya",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning({ id: serviceCatalog.id, name: serviceCatalog.name });

    const [paracetamol, amoxicillin, vitaminC] = await tx
      .insert(medicines)
      .values([
        {
          name: "Paracetamol 500mg",
          description: "Obat penurun demam dan nyeri",
          category: "Analgesik",
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
          unit: "tablet",
          pharmacistId: pharmacistUser.id,
          price: "3000.00",
          minimumStock: 100,
          reorderThresholdPercentage: 20,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning({ id: medicines.id, name: medicines.name });

    const [paracetamolStock, amoxicillinStock, vitaminCStock, expiredVitaminC] =
      await tx
        .insert(medicineStocks)
        .values([
          {
            medicineId: paracetamol.id,
            batchNumber: "PARA-001",
            quantity: 200,
            remainingQuantity: 200,
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
            remainingQuantity: 106,
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
        ])
        .returning({ id: medicineStocks.id, batchNumber: medicineStocks.batchNumber });

    const [reservationWaiting] = await tx
      .insert(reservations)
      .values({
        patientId: patientOneUser.id,
        doctorId: doctorUser.id,
        scheduleId: todayScheduleId,
        reservationDate: setTime(today, 9, 0),
        queueNumber: 1,
        status: "Confirmed",
        examinationStatus: "Waiting",
        complaint: "Demam sejak semalam",
        isPriority: true,
        priorityReason: "Sesak napas ringan",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationInProgress] = await tx
      .insert(reservations)
      .values({
        patientId: patientTwoUser.id,
        doctorId: doctorUser.id,
        scheduleId: todayScheduleId,
        reservationDate: setTime(today, 9, 30),
        queueNumber: 2,
        status: "Confirmed",
        examinationStatus: "In Progress",
        complaint: "Batuk berdahak",
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
        reservationDate: setTime(today, 10, 0),
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
        reservationDate: setTime(today, 8, 15),
        queueNumber: 4,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Flu dan nyeri tenggorokan",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationTomorrow] = await tx
      .insert(reservations)
      .values({
        patientId: patientOneUser.id,
        doctorId: doctorUser.id,
        scheduleId: tomorrowScheduleId,
        reservationDate: setTime(tomorrow, 10, 0),
        queueNumber: 1,
        status: "Pending",
        examinationStatus: "Waiting",
        complaint: "Kontrol pasca obat",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: reservations.id });

    const [reservationCompletedYesterday] = await tx
      .insert(reservations)
      .values({
        patientId: patientOneUser.id,
        doctorId: doctorUser.id,
        scheduleId: yesterdayScheduleId,
        reservationDate: setTime(yesterday, 10, 0),
        queueNumber: 1,
        status: "Completed",
        examinationStatus: "Completed",
        complaint: "Kontrol hipertensi",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      })
      .returning({ id: reservations.id });

    // Avoid unused variable warnings in strict environments.
    void reservationWaiting;
    void reservationInProgress;
    void reservationTomorrow;

    const [historyWaitingPayment] = await tx
      .insert(medicalHistories)
      .values({
        patientId: patientThreeUser.id,
        reservationId: reservationWaitingPayment.id,
        nurseId: nurseUser.id,
        encryptedNurseNotes: "Tekanan darah 120/80, suhu 37.3C",
        nurseCheckupTimestamp: setTime(today, 10, 15),
        doctorId: doctorUser.id,
        encryptedCondition: "Cephalgia",
        encryptedDescription: "Sakit kepala tegang",
        encryptedTreatment: "Istirahat dan analgesik",
        encryptedDoctorNotes: "Kontrol jika nyeri berlanjut lebih dari 3 hari",
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
        encryptedNurseNotes: "Suhu 38.1C, batuk ringan",
        nurseCheckupTimestamp: setTime(today, 8, 30),
        doctorId: doctorUser.id,
        encryptedCondition: "ISPA ringan",
        encryptedDescription: "Flu dan radang tenggorokan",
        encryptedTreatment: "Obat simptomatik dan antibiotik",
        encryptedDoctorNotes: "Perbanyak minum air hangat",
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
        encryptedNurseNotes: "Tekanan darah 140/90",
        nurseCheckupTimestamp: setTime(yesterday, 10, 10),
        doctorId: doctorUser.id,
        encryptedCondition: "Hipertensi",
        encryptedDescription: "Kontrol tekanan darah",
        encryptedTreatment: "Lanjutkan terapi rutin",
        encryptedDoctorNotes: "Monitoring tekanan darah harian",
        dateOfDiagnosis: toDateOnly(yesterday),
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
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
        serviceId: procedureService.id,
        quantity: 1,
        notes: "Tindakan singkat",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
    ]);

    const [prescriptionWaitingPayment, prescriptionPaidReady, prescriptionDone] =
      await tx
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
        ])
        .returning({ id: prescriptions.id });

    await tx.insert(prescriptionMedicines).values([
      {
        prescriptionId: prescriptionWaitingPayment.id,
        medicineId: paracetamol.id,
        stockId: paracetamolStock.id,
        encryptedDosage: "500 mg",
        encryptedFrequency: "3x sehari",
        encryptedDuration: "5 hari",
        quantityUsed: 10,
        createdAt: now,
        updatedAt: now,
      },
      {
        prescriptionId: prescriptionPaidReady.id,
        medicineId: amoxicillin.id,
        stockId: amoxicillinStock.id,
        encryptedDosage: "500 mg",
        encryptedFrequency: "3x sehari",
        encryptedDuration: "7 hari",
        quantityUsed: 14,
        createdAt: now,
        updatedAt: now,
      },
      {
        prescriptionId: prescriptionDone.id,
        medicineId: vitaminC.id,
        stockId: vitaminCStock.id,
        encryptedDosage: "500 mg",
        encryptedFrequency: "1x sehari",
        encryptedDuration: "5 hari",
        quantityUsed: 5,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
    ]);

    // Avoid unused variable warning.
    void expiredVitaminC;
    void adminFeeService;

    const [paymentToday] = await tx
      .insert(payments)
      .values({
        patientId: patientOneUser.id,
        reservationId: reservationCompletedToday.id,
        receptionistId: receptionistUser.id,
        totalAmount: "248000.00",
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
        unitPrice: "98000.00",
        subtotal: "98000.00",
        notes: "Obat tebus resep",
        createdAt: now,
        updatedAt: now,
      },
      {
        paymentId: paymentYesterday.id,
        itemType: "Service",
        serviceId: procedureService.id,
        prescriptionId: null,
        quantity: 1,
        unitPrice: "120000.00",
        subtotal: "120000.00",
        notes: "Tindakan",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
      },
      {
        paymentId: paymentYesterday.id,
        itemType: "Prescription",
        serviceId: null,
        prescriptionId: prescriptionDone.id,
        quantity: 1,
        unitPrice: "15000.00",
        subtotal: "15000.00",
        notes: "Obat tebus resep",
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
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
        enableAutoCancel: false,
        autoCancelGraceMinutes: 30,
        createdAt: now,
        updatedAt: now,
      });
    });

    console.log("Seed completed successfully.");
    console.log("Demo accounts (all passwords are the same):");
    console.log(`- admin / ${TEST_PASSWORD}`);
    console.log(`- doctor / ${TEST_PASSWORD}`);
    console.log(`- nurse / ${TEST_PASSWORD}`);
    console.log(`- receptionist / ${TEST_PASSWORD}`);
    console.log(`- pharmacist / ${TEST_PASSWORD}`);
    console.log(`- patient1 / ${TEST_PASSWORD}`);
    console.log(`- patient2 / ${TEST_PASSWORD}`);
    console.log(`- patient3 / ${TEST_PASSWORD}`);
    console.log(
      "- patient_pending (status Pending, intentionally blocked from login)"
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
