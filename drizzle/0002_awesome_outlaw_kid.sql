CREATE TYPE "public"."material_movement_type" AS ENUM('entree', 'sortie');--> statement-breakpoint
CREATE TABLE "material_stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plastic_type" varchar(80) NOT NULL,
	"movement_type" "material_movement_type" NOT NULL,
	"quantity_kg" numeric(10, 3) NOT NULL,
	"delivery_id" uuid,
	"reason" text,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_stock_movements_delivery_id_unique" UNIQUE("delivery_id"),
	CONSTRAINT "material_movements_quantity_positive" CHECK ("material_stock_movements"."quantity_kg" > 0),
	CONSTRAINT "material_movements_delivery_is_inbound" CHECK ("material_stock_movements"."delivery_id" IS NULL OR "material_stock_movements"."movement_type" = 'entree')
);
--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_stock_movements_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_stock_movements_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_rejection_reason" CHECK ("deliveries"."rejected_kg" IS NULL OR "deliveries"."rejected_kg" = 0 OR "deliveries"."rejection_reason" IS NOT NULL);