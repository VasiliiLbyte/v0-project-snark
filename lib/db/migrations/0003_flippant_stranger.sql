ALTER TABLE "departments" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "regulations_doc_id" uuid;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "standards_doc_id" uuid;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_regulations_doc_id_documents_id_fk" FOREIGN KEY ("regulations_doc_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_standards_doc_id_documents_id_fk" FOREIGN KEY ("standards_doc_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;