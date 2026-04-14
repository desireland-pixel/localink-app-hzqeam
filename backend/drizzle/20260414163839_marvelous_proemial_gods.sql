ALTER TABLE "user" ADD COLUMN "scheduled_deletion_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deletion_requested_at" timestamp;