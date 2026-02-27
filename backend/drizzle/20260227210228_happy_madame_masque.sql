ALTER TABLE "profiles" DROP CONSTRAINT "profiles_username_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique_idx" ON "profiles" USING btree ("username");