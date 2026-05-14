ALTER TABLE "employee_profiles" ADD COLUMN "inn" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "snils" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "citizenship" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "anniversary_years" integer;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "professions" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "education" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "manager_position" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "contract_end_date" date;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "is_contractor" boolean DEFAULT false NOT NULL;