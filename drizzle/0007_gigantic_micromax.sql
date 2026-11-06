CREATE TABLE "sale_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"sales_order_line_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_code" varchar(40) NOT NULL,
	"product_name" varchar(120) NOT NULL,
	"unit_label" varchar(40) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_lines_sales_order_line_id_unique" UNIQUE("sales_order_line_id"),
	CONSTRAINT "sale_line_quantity_positive" CHECK ("sale_lines"."quantity" > 0),
	CONSTRAINT "sale_line_amounts_non_negative" CHECK ("sale_lines"."unit_price" >= 0 AND "sale_lines"."total_amount" >= 0),
	CONSTRAINT "sale_line_total_matches" CHECK ("sale_lines"."total_amount" = "sale_lines"."quantity" * "sale_lines"."unit_price")
);
--> statement-breakpoint
CREATE TABLE "sales_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_code" varchar(40) NOT NULL,
	"product_name" varchar(120) NOT NULL,
	"unit_label" varchar(40) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_line_quantity_positive" CHECK ("sales_order_lines"."quantity" > 0),
	CONSTRAINT "sales_order_line_amounts_non_negative" CHECK ("sales_order_lines"."unit_price" >= 0 AND "sales_order_lines"."total_amount" >= 0),
	CONSTRAINT "sales_order_line_total_matches" CHECK ("sales_order_lines"."total_amount" = "sales_order_lines"."quantity" * "sales_order_lines"."unit_price")
);
--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" DROP CONSTRAINT "finished_product_stock_movements_sale_id_unique";--> statement-breakpoint
ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_order_total_matches_quantity";--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD COLUMN "sale_line_id" uuid;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sales_order_line_id_sales_order_lines_id_fk" FOREIGN KEY ("sales_order_line_id") REFERENCES "public"."sales_order_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM "products" WHERE "code" = 'BALAI') THEN
		RAISE EXCEPTION 'Le produit Balai doit exister avant le backfill des ventes.';
	END IF;
END $$;--> statement-breakpoint
INSERT INTO "sales_order_lines" (
	"sales_order_id",
	"product_id",
	"product_code",
	"product_name",
	"unit_label",
	"quantity",
	"unit_price",
	"total_amount",
	"created_at"
)
SELECT
	orders.id,
	product.id,
	product.code,
	product.name,
	product.unit_label,
	orders.quantity,
	orders.unit_price,
	orders.total_amount,
	orders.created_at
FROM "sales_orders" AS orders
JOIN "products" AS product ON product.code = 'BALAI'
WHERE NOT EXISTS (
	SELECT 1 FROM "sales_order_lines" AS sol WHERE sol.sales_order_id = orders.id
);--> statement-breakpoint
INSERT INTO "sale_lines" (
	"sale_id",
	"sales_order_line_id",
	"product_id",
	"product_code",
	"product_name",
	"unit_label",
	"quantity",
	"unit_price",
	"total_amount",
	"created_at"
)
SELECT
	sale.id,
	sol.id,
	sol.product_id,
	sol.product_code,
	sol.product_name,
	sol.unit_label,
	sale.quantity,
	sale.unit_price,
	sale.total_amount,
	sale.created_at
FROM "sales" AS sale
JOIN "sales_order_lines" AS sol ON sol.sales_order_id = sale.order_id
WHERE NOT EXISTS (
	SELECT 1 FROM "sale_lines" AS sl WHERE sl.sale_id = sale.id
);--> statement-breakpoint
UPDATE "finished_product_stock_movements" AS movement
SET "sale_line_id" = (
	SELECT sl.id
	FROM "sale_lines" AS sl
	WHERE sl.sale_id = movement.sale_id
	LIMIT 1
)
WHERE movement.sale_id IS NOT NULL AND movement.sale_line_id IS NULL;--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_stock_movements_sale_line_id_sale_lines_id_fk" FOREIGN KEY ("sale_line_id") REFERENCES "public"."sale_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_stock_movements_sale_line_id_unique" UNIQUE("sale_line_id");--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_sale_line_is_outbound" CHECK ("finished_product_stock_movements"."sale_line_id" IS NULL OR "finished_product_stock_movements"."movement_type" = 'sortie');--> statement-breakpoint
ALTER TABLE "finished_product_stock_movements" ADD CONSTRAINT "finished_product_sale_line_movement_single_source" CHECK ("finished_product_stock_movements"."sale_line_id" IS NULL OR "finished_product_stock_movements"."production_order_line_id" IS NULL);--> statement-breakpoint
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

	IF NEW.sale_id IS NOT NULL AND NEW.sale_line_id IS NULL THEN
		SELECT id INTO line_id
		FROM "sale_lines"
		WHERE sale_id = NEW.sale_id
			AND product_id = NEW.product_id
		ORDER BY created_at
		LIMIT 1;
		IF line_id IS NOT NULL THEN
			NEW.sale_line_id := line_id;
		END IF;
	END IF;

	RETURN NEW;
END;
$$;