CREATE TABLE "match_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"post_type" text NOT NULL,
	"matched_post_id" uuid NOT NULL,
	"matched_post_type" text NOT NULL,
	"notified_user_id" text NOT NULL,
	"push_sent" boolean DEFAULT false NOT NULL,
	"push_sent_at" timestamp with time zone,
	"email_sent" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_notifications" ADD CONSTRAINT "match_notifications_notified_user_id_user_id_fk" FOREIGN KEY ("notified_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;