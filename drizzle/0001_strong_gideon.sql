CREATE TYPE "public"."user_role" AS ENUM('admin', 'supervisor', 'encarregado', 'user');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "custom_id" varchar(20);--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_custom_id_unique" UNIQUE("custom_id");