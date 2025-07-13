DROP TABLE "it_support_requests" CASCADE;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."request_type";--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('purchase', 'service', 'maintenance');--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "type" SET DATA TYPE "public"."request_type" USING "type"::"public"."request_type";