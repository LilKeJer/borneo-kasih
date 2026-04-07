ALTER TABLE "Reservation" ADD COLUMN "cancellation_reason" varchar(50);--> statement-breakpoint
ALTER TABLE "ClinicSettings" ADD COLUMN "enable_strict_checkin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ClinicSettings" ADD COLUMN "checkin_early_minutes" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "ClinicSettings" ADD COLUMN "checkin_late_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "ClinicSettings" ADD COLUMN "enable_auto_cancel" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ClinicSettings" ADD COLUMN "auto_cancel_grace_minutes" integer DEFAULT 30 NOT NULL;