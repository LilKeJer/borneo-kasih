ALTER TABLE "Prescription" ADD COLUMN "payment_status" varchar(20) NOT NULL DEFAULT 'Unpaid';--> statement-breakpoint
ALTER TABLE "Prescription" ADD COLUMN "dispense_status" varchar(20) NOT NULL DEFAULT 'Pending';
