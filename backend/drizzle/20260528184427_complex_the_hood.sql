CREATE TABLE IF NOT EXISTS "post_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"post_id" text NOT NULL,
	"post_type" text NOT NULL,
	"outcome" text NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'post_outcomes'
    AND constraint_name = 'post_outcomes_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "post_outcomes" ADD CONSTRAINT "post_outcomes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;