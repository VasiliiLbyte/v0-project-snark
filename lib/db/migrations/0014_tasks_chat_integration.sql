-- Tasks + Chat integration (iterations 1–2)

ALTER TYPE "chat_channel_type" ADD VALUE IF NOT EXISTS 'task';

ALTER TABLE "chat_channels" ADD COLUMN IF NOT EXISTS "task_id" uuid;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "message_type" text NOT NULL DEFAULT 'user';
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "reply_to_id" uuid;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "metadata" jsonb;

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_message_id" uuid;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_channel_id" uuid;

DO $$ BEGIN
  ALTER TABLE "chat_channels"
    ADD CONSTRAINT "chat_channels_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "chat_messages"
    ADD CONSTRAINT "chat_messages_reply_to_id_fkey"
    FOREIGN KEY ("reply_to_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "chat_channels_task_id_idx"
  ON "chat_channels" ("task_id") WHERE "task_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "task_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "task_participants_task_user_role_idx" UNIQUE("task_id", "user_id", "role")
);

CREATE TABLE IF NOT EXISTS "task_checklist_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "is_done" boolean DEFAULT false NOT NULL,
  "assignee_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "task_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "task_links_unique_idx" UNIQUE("task_id", "entity_type", "entity_id")
);

CREATE INDEX IF NOT EXISTS "task_checklist_items_task_idx" ON "task_checklist_items" ("task_id", "sort_order");
CREATE INDEX IF NOT EXISTS "task_participants_task_idx" ON "task_participants" ("task_id");
