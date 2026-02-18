ALTER TABLE "alias" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "alias" ADD COLUMN "android_target" varchar(2048);--> statement-breakpoint
ALTER TABLE "alias" ADD COLUMN "ios_target" varchar(2048);