CREATE TYPE "public"."collector_type" AS ENUM('individuel', 'association', 'groupe');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('recue', 'triee', 'integree_au_stock');--> statement-breakpoint
CREATE TABLE "collectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "collector_type" NOT NULL,
	"phone" varchar(40),
	"zone" varchar(120),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collector_id" uuid NOT NULL,
	"delivery_date" date NOT NULL,
	"collection_point" varchar(160) NOT NULL,
	"plastic_type" varchar(80) NOT NULL,
	"received_kg" numeric(10, 3) NOT NULL,
	"accepted_kg" numeric(10, 3),
	"rejected_kg" numeric(10, 3),
	"rejection_reason" text,
	"status" "delivery_status" DEFAULT 'recue' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliveries_received_kg_positive" CHECK ("received_kg" > 0),
	CONSTRAINT "deliveries_sort_balance" CHECK (("status" = 'recue' AND "accepted_kg" IS NULL AND "rejected_kg" IS NULL) OR ("status" IN ('triee', 'integree_au_stock') AND "accepted_kg" IS NOT NULL AND "rejected_kg" IS NOT NULL AND "accepted_kg" >= 0 AND "rejected_kg" >= 0 AND "accepted_kg" + "rejected_kg" = "received_kg"))
);
--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_collector_id_collectors_id_fk" FOREIGN KEY ("collector_id") REFERENCES "public"."collectors"("id") ON DELETE restrict ON UPDATE no action;
