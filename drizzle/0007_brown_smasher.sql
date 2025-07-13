ALTER TABLE "purchase_requests" RENAME COLUMN "unit_price" TO "unit_price_in_cents";--> statement-breakpoint
ALTER TABLE "requests" RENAME COLUMN "unit_price" TO "unit_price_in_cents";--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "po_number" varchar(20);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "need_approved_by" varchar(256);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "finance_approved_by" varchar(256);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "executed_by" varchar(256);