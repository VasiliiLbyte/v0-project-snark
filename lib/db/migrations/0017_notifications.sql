-- Iteration 2: in-app notifications + task reminder idempotency

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_read_created_idx"
  ON "notifications" ("user_id", "read_at", "created_at");

CREATE TABLE IF NOT EXISTS "task_reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "task_reminders_unique_idx" UNIQUE ("task_id", "user_id", "kind")
);

CREATE INDEX IF NOT EXISTS "task_reminders_task_idx" ON "task_reminders" ("task_id");
