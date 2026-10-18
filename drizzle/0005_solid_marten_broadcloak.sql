CREATE TABLE "product_technical_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"effective_from" date,
	"standard_bands_kg_per_unit" numeric(10, 3),
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_technical_specs_version_positive" CHECK ("product_technical_specs"."version" > 0),
	CONSTRAINT "product_technical_specs_standard_bands_non_negative" CHECK ("product_technical_specs"."standard_bands_kg_per_unit" IS NULL OR "product_technical_specs"."standard_bands_kg_per_unit" > 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"unit_label" varchar(40) DEFAULT 'unité' NOT NULL,
	"alert_threshold" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code"),
	CONSTRAINT "products_alert_threshold_non_negative" CHECK ("products"."alert_threshold" IS NULL OR "products"."alert_threshold" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_technical_specs" ADD CONSTRAINT "product_technical_specs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_technical_specs" ADD CONSTRAINT "product_technical_specs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_technical_specs_product_version_unique" ON "product_technical_specs" USING btree ("product_id","version");
--> statement-breakpoint
INSERT INTO "products" ("code", "name") VALUES
	('BALAI', 'Balai'),
	('BROSSE', 'Brosse'),
	('BROSSE_LAVER_MANCHE', 'Brosse à laver avec manche'),
	('FILE_LINGE', 'File à linge'),
	('PAVE', 'Pavé')
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
INSERT INTO "product_technical_specs" (
	"product_id",
	"version",
	"specifications"
)
SELECT "products"."id", 1, '{}'::jsonb
FROM "products"
WHERE NOT EXISTS (
	SELECT 1
	FROM "product_technical_specs"
	WHERE "product_technical_specs"."product_id" = "products"."id"
);--> statement-breakpoint