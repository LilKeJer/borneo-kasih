DROP INDEX "idx_daily_schedule";--> statement-breakpoint
DROP INDEX "idx_doctor_schedule";--> statement-breakpoint
CREATE UNIQUE INDEX "unique_doctor_schedule" ON "DoctorSchedule" USING btree ("doctor_id","session_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_doctor_schedule" ON "DoctorSchedule" USING btree ("doctor_id","day_of_week");