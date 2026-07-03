-- Task manager enhancements: important flag, completion result, attachments

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_important" boolean NOT NULL DEFAULT false;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completion_result" text;

CREATE TABLE IF NOT EXISTS "task_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "file_url" text NOT NULL,
  "mime_type" text,
  "size_bytes" integer,
  "attachment_type" text NOT NULL DEFAULT 'general',
  "uploaded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "task_attachments_task_idx" ON "task_attachments" ("task_id", "created_at");
