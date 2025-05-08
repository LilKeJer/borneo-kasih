ALTER TABLE "DailyScheduleStatus" DROP CONSTRAINT "DailyScheduleStatus_schedule_id_date_unique";--> statement-breakpoint
ALTER TABLE "DoctorSchedule" DROP CONSTRAINT "DoctorSchedule_doctor_id_session_id_day_of_week_unique";--> statement-breakpoint
CREATE INDEX "idx_admin_name" ON "AdminDetails" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_doctor_name" ON "DoctorDetails" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_specialization" ON "DoctorDetails" USING btree ("specialization");--> statement-breakpoint
CREATE INDEX "idx_nurse_name" ON "NurseDetails" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_patient_name" ON "PatientDetails" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_nik" ON "PatientDetails" USING btree ("nik");--> statement-breakpoint
CREATE INDEX "idx_pharmacist_name" ON "PharmacistDetails" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_receptionist_name" ON "ReceptionistDetails" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_username" ON "Users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_role" ON "Users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_daily_schedule" ON "DailyScheduleStatus" USING btree ("schedule_id","date");--> statement-breakpoint
CREATE INDEX "idx_schedule_date" ON "DailyScheduleStatus" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_doctor_schedule" ON "DoctorSchedule" USING btree ("doctor_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_active_schedule" ON "DoctorSchedule" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_patient_records" ON "MedicalHistory" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_diagnosis_date" ON "MedicalHistory" USING btree ("date_of_diagnosis");--> statement-breakpoint
CREATE INDEX "idx_doctor_records" ON "MedicalHistory" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_stock_medicine" ON "MedicineStock" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "idx_stock_expiry" ON "MedicineStock" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "idx_stock_remaining" ON "MedicineStock" USING btree ("remaining_quantity");--> statement-breakpoint
CREATE INDEX "idx_medicine_name" ON "Medicine" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_medicine_pharmacist" ON "Medicine" USING btree ("pharmacist_id");--> statement-breakpoint
CREATE INDEX "idx_prescription_medicine_prescription" ON "PrescriptionMedicine" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "idx_prescription_medicine_medicine" ON "PrescriptionMedicine" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "idx_prescription_medical_history" ON "Prescription" USING btree ("medical_history_id");--> statement-breakpoint
CREATE INDEX "idx_payment_date" ON "Payment" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "idx_payment_patient" ON "Payment" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_payment_reservation" ON "Payment" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "idx_payment_status" ON "Payment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payment_method" ON "Payment" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "idx_reservation_date" ON "Reservation" USING btree ("reservation_date");--> statement-breakpoint
CREATE INDEX "idx_reservation_patient" ON "Reservation" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_reservation_doctor" ON "Reservation" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_reservation_status" ON "Reservation" USING btree ("status");