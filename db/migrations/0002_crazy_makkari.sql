DROP INDEX "idx_doctor_schedule";--> statement-breakpoint
CREATE UNIQUE INDEX "unique_daily_schedule" ON "DailyScheduleStatus" USING btree ("schedule_id","date");--> statement-breakpoint
CREATE INDEX "idx_doctor_schedule" ON "DoctorSchedule" USING btree ("doctor_id","day_of_week","day_of_week");--> statement-breakpoint
ALTER TABLE "PatientDetails" ADD CONSTRAINT "check_gender" CHECK ("PatientDetails"."gender" IN ('L', 'P'));--> statement-breakpoint
ALTER TABLE "Users" ADD CONSTRAINT "check_role" CHECK ("Users"."role" IN ('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Patient'));--> statement-breakpoint
ALTER TABLE "DoctorSchedule" ADD CONSTRAINT "check_day_of_week" CHECK ("DoctorSchedule"."day_of_week" BETWEEN 0 AND 6);--> statement-breakpoint
ALTER TABLE "MedicineStock" ADD CONSTRAINT "check_quantity" CHECK ("MedicineStock"."quantity" >= 0);--> statement-breakpoint
ALTER TABLE "MedicineStock" ADD CONSTRAINT "check_remaining_quantity" CHECK ("MedicineStock"."remaining_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "Medicine" ADD CONSTRAINT "check_price" CHECK ("Medicine"."price" > 0);--> statement-breakpoint
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "check_quantity_used" CHECK ("PrescriptionMedicine"."quantity_used" > 0);--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "check_total_amount" CHECK ("Payment"."total_amount" >= 0);--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "check_payment_method" CHECK ("Payment"."payment_method" IN ('Cash', 'Debit', 'Credit', 'Transfer', 'BPJS'));--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "check_payment_status" CHECK ("Payment"."status" IN ('Pending', 'Paid', 'Cancelled'));--> statement-breakpoint
ALTER TABLE "Reservation" ADD CONSTRAINT "check_reservation_status" CHECK ("Reservation"."status" IN ('Pending', 'Confirmed', 'Completed', 'Cancelled'));--> statement-breakpoint
ALTER TABLE "Reservation" ADD CONSTRAINT "check_examination_status" CHECK ("Reservation"."examination_status" IS NULL OR "Reservation"."examination_status" IN ('Waiting', 'In Progress', 'Completed', 'Cancelled'));