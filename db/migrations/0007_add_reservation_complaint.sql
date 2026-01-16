ALTER TABLE "Reservation" ADD COLUMN "complaint" text;--> statement-breakpoint
ALTER TABLE "Reservation" DROP CONSTRAINT IF EXISTS "check_examination_status";--> statement-breakpoint
ALTER TABLE "Reservation" ADD CONSTRAINT "check_examination_status" CHECK ("Reservation"."examination_status" IS NULL OR "Reservation"."examination_status" IN ('Waiting', 'In Progress', 'Completed', 'Cancelled', 'Waiting for Payment'));--> statement-breakpoint
ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "check_user_status";--> statement-breakpoint
ALTER TABLE "Users" ADD CONSTRAINT "check_user_status" CHECK ("Users"."status" IN ('Active', 'Pending', 'Verified', 'Suspended', 'Inactive', 'Rejected'));
