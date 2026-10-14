CREATE TYPE "public"."finished_product_movement_type" AS ENUM('entree', 'sortie');--> statement-breakpoint
CREATE TABLE "finished_product_stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movement_type" "finished_product_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"production_order_id" uuid,
	"reason" text,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finished_product_stock_movements_production_order_id_unique" UNIQUE("production_order_id"),
	CONSTRAINT "finished_product_quantity_positive" CHECK ("finished_product_stock_movements"."quantity" > 0),
	CONSTRAINT "finished_product_production_is_inbound" CHECK ("finished_product_stock_movements"."production_order_id" IS NULL OR "finished_product_stock_movements"."movement_type" = 'entree')
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"production_date" date NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"plastic_type" varchar(80) NOT NULL,
	"material_used_kg" numeric(10, 3) NOT NULL,
	"bands_prepared_kg" numeric(10, 3) NOT NULL,
	"brooms_produced" integer NOT NULL,
	"loss_kg" numeric(10, 3) NOT NULL,
	"loss_reason" text,
	"material_cost_per_kg" numeric(14, 2) NOT NULL,
	"labor_cost" numeric(14, 2) NOT NULL,
	"energy_cost" numeric(14, 2) NOT NULL,
	"accessories_cost" numeric(14, 2) NOT NULL,
	"material_cost" numeric(14, 2) NOT NULL,
	"total_cost" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_material_used_positive" CHECK ("production_orders"."material_used_kg" > 0),
	CONSTRAINT "production_bands_kg_non_negative" CHECK ("production_orders"."bands_prepared_kg" >= 0),
	CONSTRAINT "production_brooms_positive" CHECK ("production_orders"."brooms_produced" > 0),
	CONSTRAINT "production_loss_kg_non_negative" CHECK ("production_orders"."loss_kg" >= 0),
	CONSTRAINT "production_material_balance" CHECK ("production_orders"."material_used_kg" = "production_orders"."bands_prepared_kg" + "production_orders"."loss_kg"),
	CONSTRAINT "production_loss_reason" CHECK ("production_orders"."loss_kg" = 0 OR "production_orders"."loss_reason" IS NOT NULL),
	CONSTRAINT "production_costs_non_negative" CHECK ("production_orders"."material_cost_per_kg" >= 0 AND "production_orders"."labor_cost" >= 0 AND "production_orders"."energy_cost" >= 0 AND "production_orders"."accessories_cost" >= 0 AND "production_orders"."material_cost" >= 0 AND "production_orders"."total_cost" >= 0)
);
--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD COLUMN "production_order_id" uuid;--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_stock_movements_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_stock_movements_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_stock_movements_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_stock_movements_production_order_id_unique" UNIQUE("production_order_id");--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_movements_production_is_outbound" CHECK ("material_stock_movements"."production_order_id" IS NULL OR "material_stock_movements"."movement_type" = 'sortie');--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_movements_single_source" CHECK ("material_stock_movements"."delivery_id" IS NULL OR "material_stock_movements"."production_order_id" IS NULL);