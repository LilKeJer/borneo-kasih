CREATE TABLE "ClinicSettings" (
	"id" serial PRIMARY KEY NOT NULL,
	"clinic_name" varchar(150) NOT NULL,
	"address" varchar(255) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"email" varchar(150) NOT NULL,
	"morning_start" varchar(5) NOT NULL,
	"morning_end" varchar(5) NOT NULL,
	"evening_start" varchar(5) NOT NULL,
	"evening_end" varchar(5) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "MedicalHistoryService" (
	"id" serial PRIMARY KEY NOT NULL,
	"medical_history_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "check_medical_history_service_quantity" CHECK ("MedicalHistoryService"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "MedicalHistoryService" ADD CONSTRAINT "MedicalHistoryService_medical_history_id_MedicalHistory_id_fk" FOREIGN KEY ("medical_history_id") REFERENCES "public"."MedicalHistory"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "MedicalHistoryService" ADD CONSTRAINT "MedicalHistoryService_service_id_ServiceCatalog_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."ServiceCatalog"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_medical_history_service_history" ON "MedicalHistoryService" USING btree ("medical_history_id");
--> statement-breakpoint
CREATE INDEX "idx_medical_history_service_service" ON "MedicalHistoryService" USING btree ("service_id");
