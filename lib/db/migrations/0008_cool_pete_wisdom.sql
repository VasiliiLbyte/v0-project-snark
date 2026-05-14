ALTER TABLE "employee_profiles" ADD COLUMN "annual_leave_days" integer DEFAULT 28 NOT NULL;--> statement-breakpoint
ALTER TABLE "vacations" ADD COLUMN "type" text DEFAULT 'annual' NOT NULL;--> statement-breakpoint
ALTER TABLE "vacations" ADD COLUMN "comment" text;--> statement-breakpoint
ALTER TABLE "vacations" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;