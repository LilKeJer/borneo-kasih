CREATE TABLE "AdminDetails" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100),
	"phone" varchar(20),
	CONSTRAINT "AdminDetails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "DoctorDetails" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"specialization" varchar(100),
	"email" varchar(100),
	"phone" varchar(20),
	CONSTRAINT "DoctorDetails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "NurseDetails" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100),
	"phone" varchar(20),
	CONSTRAINT "NurseDetails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "PatientDetails" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"nik" varchar(16) NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100),
	"phone" varchar(20),
	"date_of_birth" timestamp,
	"address" varchar(255),
	"gender" varchar(1),
	CONSTRAINT "PatientDetails_nik_unique" UNIQUE("nik"),
	CONSTRAINT "PatientDetails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "PharmacistDetails" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100),
	"phone" varchar(20),
	CONSTRAINT "PharmacistDetails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ReceptionistDetails" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100),
	"phone" varchar(20),
	CONSTRAINT "ReceptionistDetails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "Users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "Users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "DailyScheduleStatus" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"date" date NOT NULL,
	"is_active" boolean DEFAULT true,
	"current_reservations" integer DEFAULT 0,
	"notes" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "DailyScheduleStatus_schedule_id_date_unique" UNIQUE("schedule_id","date")
);
--> statement-breakpoint
CREATE TABLE "DoctorSchedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"max_patients" integer DEFAULT 30,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "DoctorSchedule_doctor_id_session_id_day_of_week_unique" UNIQUE("doctor_id","session_id","day_of_week")
);
--> statement-breakpoint
CREATE TABLE "MedicalHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"nurse_id" integer NOT NULL,
	"encrypted_nurse_notes" text,
	"encryption_iv_nurse" text,
	"nurse_checkup_timestamp" timestamp DEFAULT now(),
	"doctor_id" integer NOT NULL,
	"encrypted_condition" text,
	"encrypted_description" text,
	"encrypted_treatment" text,
	"encrypted_doctor_notes" text,
	"encryption_iv_doctor" text,
	"date_of_diagnosis" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "PracticeSession" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"description" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "MedicineStock" (
	"id" serial PRIMARY KEY NOT NULL,
	"medicine_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"remaining_quantity" integer NOT NULL,
	"expiry_date" date,
	"added_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "Medicine" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"pharmacist_id" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "PrescriptionMedicine" (
	"id" serial PRIMARY KEY NOT NULL,
	"prescription_id" integer NOT NULL,
	"medicine_id" integer NOT NULL,
	"stock_id" integer NOT NULL,
	"encrypted_dosage" text,
	"encrypted_frequency" text,
	"encrypted_duration" text,
	"encryption_iv" text,
	"quantity_used" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "Prescription" (
	"id" serial PRIMARY KEY NOT NULL,
	"medical_history_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "Payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"reservation_id" integer NOT NULL,
	"receptionist_id" integer NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_date" timestamp DEFAULT now(),
	"payment_method" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"prescription_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "Reservation" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"schedule_id" integer NOT NULL,
	"reservation_date" timestamp NOT NULL,
	"queue_number" integer,
	"status" varchar(20) NOT NULL,
	"examination_status" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "AdminDetails" ADD CONSTRAINT "AdminDetails_user_id_Users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DoctorDetails" ADD CONSTRAINT "DoctorDetails_user_id_Users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NurseDetails" ADD CONSTRAINT "NurseDetails_user_id_Users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PatientDetails" ADD CONSTRAINT "PatientDetails_user_id_Users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PharmacistDetails" ADD CONSTRAINT "PharmacistDetails_user_id_Users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ReceptionistDetails" ADD CONSTRAINT "ReceptionistDetails_user_id_Users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DailyScheduleStatus" ADD CONSTRAINT "DailyScheduleStatus_schedule_id_DoctorSchedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."DoctorSchedule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DoctorSchedule" ADD CONSTRAINT "DoctorSchedule_doctor_id_Users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DoctorSchedule" ADD CONSTRAINT "DoctorSchedule_session_id_PracticeSession_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."PracticeSession"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patient_id_Users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_nurse_id_Users_id_fk" FOREIGN KEY ("nurse_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_doctor_id_Users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MedicineStock" ADD CONSTRAINT "MedicineStock_medicine_id_Medicine_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."Medicine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_pharmacist_id_Users_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_prescription_id_Prescription_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."Prescription"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_medicine_id_Medicine_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."Medicine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_stock_id_MedicineStock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."MedicineStock"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medical_history_id_MedicalHistory_id_fk" FOREIGN KEY ("medical_history_id") REFERENCES "public"."MedicalHistory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patient_id_Users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reservation_id_Reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."Reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receptionist_id_Users_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_prescription_id_Prescription_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."Prescription"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_patient_id_Users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_doctor_id_Users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_schedule_id_DoctorSchedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."DoctorSchedule"("id") ON DELETE no action ON UPDATE no action;