CREATE TABLE "it_support_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"issue_title" varchar(256),
	"urgency" "request_priority"
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"location" varchar(256),
	"maintenance_type" varchar(256),
	"priority" "request_priority"
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"product_name" varchar(256),
	"quantity" integer,
	"unit_price" numeric(10, 2),
	"supplier" varchar(256),
	"priority" "request_priority"
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "drive_file_id" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "drive_folder_id" varchar(128);--> statement-breakpoint
ALTER TABLE "it_support_requests" ADD CONSTRAINT "it_support_requests_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;