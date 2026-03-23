ALTER TABLE "profiles" ADD COLUMN "gdpr_consent_accepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "gdpr_consent_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "data_delete_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "data_deleted_at" timestamp with time zone;