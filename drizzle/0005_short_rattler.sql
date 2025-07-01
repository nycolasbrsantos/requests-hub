CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" varchar(512) NOT NULL,
	"original_name" varchar(512) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" varchar(256) NOT NULL,
	"request_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;