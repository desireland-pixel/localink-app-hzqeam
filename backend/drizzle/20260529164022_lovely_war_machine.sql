CREATE TABLE IF NOT EXISTS "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_lower" text NOT NULL,
	"country_code" text NOT NULL,
	"population" bigint DEFAULT 0 NOT NULL,
	"search_terms" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cities_name_country_code_idx" ON "cities" USING btree ("name","country_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cities_name_lower_btree_idx" ON "cities" USING btree ("name_lower");