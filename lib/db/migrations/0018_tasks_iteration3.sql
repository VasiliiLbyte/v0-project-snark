-- Iteration 3: subtasks + activity history

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "parent_task_id" uuid
  REFERENCES "tasks"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "tasks_parent_task_id_idx" ON "tasks" ("parent_task_id");

CREATE TABLE IF NOT EXISTS "task_activity_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "field" text,
  "old_value" text,
  "new_value" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "task_activity_log_task_created_idx"
  ON "task_activity_log" ("task_id", "created_at");
