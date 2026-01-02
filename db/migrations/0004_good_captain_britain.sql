CREATE TABLE "PaymentDetail" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"service_id" integer,
	"prescription_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"notes" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "check_quantity" CHECK ("PaymentDetail"."quantity" > 0),
	CONSTRAINT "check_unit_price" CHECK ("PaymentDetail"."unit_price" >= 0),
	CONSTRAINT "check_subtotal" CHECK ("PaymentDetail"."subtotal" >= 0),
	CONSTRAINT "check_item_type" CHECK ("PaymentDetail"."item_type" IN ('Service', 'Prescription', 'Other'))
);
--> statement-breakpoint
CREATE TABLE "ServiceCatalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"base_price" numeric(10, 2) NOT NULL,
	"category" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "check_base_price" CHECK ("ServiceCatalog"."base_price" >= 0),
	CONSTRAINT "check_service_category" CHECK ("ServiceCatalog"."category" IN ('Konsultasi', 'Pemeriksaan', 'Tindakan', 'Lainnya'))
);
--> statement-breakpoint
ALTER TABLE "MedicineStock" ALTER COLUMN "expiry_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "status" varchar(20) DEFAULT 'Active';--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "verified_by" integer;--> statement-breakpoint
ALTER TABLE "MedicineStock" ADD COLUMN "batch_number" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "MedicineStock" ADD COLUMN "supplier" varchar(100);--> statement-breakpoint
ALTER TABLE "MedicineStock" ADD COLUMN "purchase_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "MedicineStock" ADD COLUMN "is_below_threshold" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "Medicine" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "Medicine" ADD COLUMN "unit" varchar(20);--> statement-breakpoint
ALTER TABLE "Medicine" ADD COLUMN "minimum_stock" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "Medicine" ADD COLUMN "reorder_threshold_percentage" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "Medicine" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Reservation" ADD COLUMN "is_priority" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "Reservation" ADD COLUMN "priority_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "PaymentDetail" ADD CONSTRAINT "PaymentDetail_payment_id_Payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."Payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentDetail" ADD CONSTRAINT "PaymentDetail_service_id_ServiceCatalog_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."ServiceCatalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentDetail" ADD CONSTRAINT "PaymentDetail_prescription_id_Prescription_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."Prescription"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payment_detail_payment" ON "PaymentDetail" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_payment_detail_type" ON "PaymentDetail" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "idx_payment_detail_service" ON "PaymentDetail" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_payment_detail_prescription" ON "PaymentDetail" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "idx_service_name" ON "ServiceCatalog" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_service_category" ON "ServiceCatalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_service_active" ON "ServiceCatalog" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "Users" ADD CONSTRAINT "Users_verified_by_Users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."Users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_status" ON "Users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_stock_batch" ON "MedicineStock" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "idx_stock_supplier" ON "MedicineStock" USING btree ("supplier");--> statement-breakpoint
CREATE INDEX "idx_medicine_category" ON "Medicine" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_medicine_active" ON "Medicine" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "Users" ADD CONSTRAINT "check_user_status" CHECK ("Users"."status" IN ('Active', 'Pending', 'Verified', 'Suspended', 'Inactive'));--> statement-breakpoint
ALTER TABLE "Medicine" ADD CONSTRAINT "check_minimum_stock" CHECK ("Medicine"."minimum_stock" >= 0);--> statement-breakpoint
ALTER TABLE "Medicine" ADD CONSTRAINT "check_threshold_percentage" CHECK ("Medicine"."reorder_threshold_percentage" BETWEEN 0 AND 100);