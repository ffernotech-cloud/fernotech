CREATE TABLE "production_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"production_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"technical_spec_id" uuid NOT NULL,
	"quantity_produced" integer NOT NULL,
	"bands_prepared_kg" numeric(10, 3) NOT NULL,
	"material_cost" numeric(14, 2) NOT NULL,
	"labor_cost" numeric(14, 2) NOT NULL,
	"energy_cost" numeric(14, 2) NOT NULL,
	"accessories_cost" numeric(14, 2) NOT NULL,
	"total_cost" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_line_quantity_positive" CHECK ("production_order_lines"."quantity_produced" > 0),
	CONSTRAINT "production_line_bands_non_negative" CHECK ("production_order_lines"."bands_prepared_kg" >= 0),
	CONSTRAINT "production_line_costs_non_negative" CHECK ("production_order_lines"."material_cost" >= 0 AND "production_order_lines"."labor_cost" >= 0 AND "production_order_lines"."energy_cost" >= 0 AND "production_order_lines"."accessories_cost" >= 0 AND "production_order_lines"."total_cost" >= 0),
	CONSTRAINT "production_line_total_cost_matches" CHECK ("production_order_lines"."total_cost" = "production_order_lines"."material_cost" + "production_order_lines"."labor_cost" + "production_order_lines"."energy_cost" + "production_order_lines"."accessories_cost")
);
--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD COLUMN "production_order_line_id" uuid;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_technical_spec_id_product_technical_specs_id_fk" FOREIGN KEY ("technical_spec_id") REFERENCES "public"."product_technical_specs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM "products" WHERE "code" = 'BALAI') THEN
		RAISE EXCEPTION 'Le produit Balai doit exister avant le backfill de production.';
	END IF;
	IF NOT EXISTS (
		SELECT 1
		FROM "product_technical_specs" AS specs
		JOIN "products" AS product ON product.id = specs.product_id
		WHERE product.code = 'BALAI' AND specs.version = 1
	) THEN
		RAISE EXCEPTION 'La fiche technique initiale de Balai manque; backfill interrompu.';
	END IF;
END $$;--> statement-breakpoint
INSERT INTO "production_order_lines" (
	"production_order_id",
	"product_id",
	"technical_spec_id",
	"quantity_produced",
	"bands_prepared_kg",
	"material_cost",
	"labor_cost",
	"energy_cost",
	"accessories_cost",
	"total_cost",
	"created_at"
)
SELECT
	orders.id,
	product.id,
	specs.id,
	orders.brooms_produced,
	orders.bands_prepared_kg,
	orders.material_cost,
	orders.labor_cost,
	orders.energy_cost,
	orders.accessories_cost,
	orders.total_cost,
	orders.created_at
FROM "production_orders" AS orders
JOIN "products" AS product ON product.code = 'BALAI'
JOIN "product_technical_specs" AS specs
	ON specs.product_id = product.id AND specs.version = 1;--> statement-breakpoint
UPDATE "finished_product_stock_movements" AS movement
SET
	"product_id" = (
		SELECT product.id FROM "products" AS product WHERE product.code = 'BALAI'
	),
	"production_order_line_id" = (
		SELECT line.id
		FROM "production_order_lines" AS line
		WHERE line.production_order_id = movement.production_order_id
	)
WHERE movement.product_id IS NULL;--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements"
	ALTER COLUMN "product_id" SET NOT NULL,
	ADD CONSTRAINT "finished_product_stock_movements_product_id_products_id_fk"
		FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_stock_movements_production_order_line_id_production_order_lines_id_fk" FOREIGN KEY ("production_order_line_id") REFERENCES "public"."production_order_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_stock_movements_production_order_line_id_unique" UNIQUE("production_order_line_id");--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_line_is_inbound" CHECK ("finished_product_stock_movements"."production_order_line_id" IS NULL OR "finished_product_stock_movements"."movement_type" = 'entree');--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_line_movement_single_source" CHECK ("finished_product_stock_movements"."production_order_line_id" IS NULL OR "finished_product_stock_movements"."sale_id" IS NULL);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "fernotech_assign_finished_product"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	balai_id uuid;
	spec_id uuid;
	line_id uuid;
	order_row "production_orders"%ROWTYPE;
BEGIN
	IF NEW.product_id IS NULL THEN
		SELECT id INTO balai_id FROM "products" WHERE code = 'BALAI';
		IF balai_id IS NULL THEN
			RAISE EXCEPTION 'Le produit Balai manque pour le mouvement historique.';
		END IF;
		NEW.product_id := balai_id;
	END IF;

	IF NEW.production_order_id IS NOT NULL AND NEW.production_order_line_id IS NULL THEN
		SELECT id INTO line_id
		FROM "production_order_lines"
		WHERE production_order_id = NEW.production_order_id
			AND product_id = NEW.product_id
		ORDER BY created_at
		LIMIT 1;
		IF line_id IS NULL THEN
			SELECT * INTO order_row
			FROM "production_orders"
			WHERE id = NEW.production_order_id;
			SELECT id INTO spec_id
			FROM "product_technical_specs"
			WHERE product_id = NEW.product_id
			ORDER BY version DESC
			LIMIT 1;
			IF order_row.id IS NULL OR spec_id IS NULL THEN
				RAISE EXCEPTION 'Impossible de relier le mouvement à sa ligne de fabrication.';
			END IF;
			INSERT INTO "production_order_lines" (
				production_order_id, product_id, technical_spec_id,
				quantity_produced, bands_prepared_kg, material_cost,
				labor_cost, energy_cost, accessories_cost, total_cost,
				created_at
			) VALUES (
				order_row.id, NEW.product_id, spec_id,
				order_row.brooms_produced, order_row.bands_prepared_kg,
				order_row.material_cost, order_row.labor_cost, order_row.energy_cost,
				order_row.accessories_cost, order_row.total_cost, order_row.created_at
			) RETURNING id INTO line_id;
		END IF;
		NEW.production_order_line_id := line_id;
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "finished_product_legacy_compatibility"
BEFORE INSERT ON "finished_product_stock_movements"
FOR EACH ROW
EXECUTE FUNCTION "fernotech_assign_finished_product"();