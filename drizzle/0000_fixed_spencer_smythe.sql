CREATE TYPE "public"."request_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'rejected', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('purchase', 'maintenance', 'it_ticket');--> statement-breakpoint
CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_name" varchar(256) NOT NULL,
	"type" "request_type" NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"product_name" varchar(256),
	"quantity" integer,
	"unit_price" numeric(10, 2),
	"supplier" varchar(256),
	"equipment" varchar(256),
	"location" varchar(256),
	"priority" "request_priority",
	"category" varchar(100)
);
