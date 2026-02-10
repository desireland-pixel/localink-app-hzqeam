ALTER TABLE "sublets" ADD COLUMN "type" text DEFAULT 'offering' NOT NULL;--> statement-breakpoint
ALTER TABLE "sublets" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "sublets" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "sublets" ADD COLUMN "city_registration_required" boolean;--> statement-breakpoint
ALTER TABLE "sublets" ADD COLUMN "deposit" text;--> statement-breakpoint
ALTER TABLE "travel_posts" ADD COLUMN "companionship_for" text;--> statement-breakpoint
ALTER TABLE "travel_posts" ADD COLUMN "travel_date_to" date;--> statement-breakpoint
ALTER TABLE "travel_posts" DROP COLUMN "title";