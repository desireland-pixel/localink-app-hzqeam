ALTER TABLE "discussion_topics" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "sublet_disclaimer_accepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "travel_disclaimer_accepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sublets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sublets" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "travel_posts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "travel_posts" ADD COLUMN "closed_at" timestamp with time zone;