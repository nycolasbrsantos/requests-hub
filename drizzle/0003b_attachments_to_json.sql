ALTER TABLE "requests" ALTER COLUMN "attachments" SET DATA TYPE json USING attachments::json;
ALTER TABLE "requests" ALTER COLUMN "attachments" SET DEFAULT '[]'::json; 