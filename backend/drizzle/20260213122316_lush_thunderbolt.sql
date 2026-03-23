ALTER TABLE "carry_posts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "carry_posts" CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_unique" UNIQUE("username");