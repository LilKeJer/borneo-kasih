ALTER TABLE "MedicalHistory" ADD COLUMN "reservation_id" integer;--> statement-breakpoint
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_reservation_id_Reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."Reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_medical_history_reservation" ON "MedicalHistory" USING btree ("reservation_id");
