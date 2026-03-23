ALTER TABLE "messages" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sublets" ADD COLUMN "independent_arrangement_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "travel_posts" ADD COLUMN "companionship_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "travel_posts" ADD COLUMN "ally_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "travel_posts" ADD COLUMN "seeking_consent" boolean DEFAULT false NOT NULL;