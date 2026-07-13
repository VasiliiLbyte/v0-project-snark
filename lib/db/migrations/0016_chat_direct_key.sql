-- Iteration 1: direct channel dedup key
ALTER TABLE "chat_channels" ADD COLUMN IF NOT EXISTS "direct_key" text;

CREATE UNIQUE INDEX IF NOT EXISTS "chat_channels_direct_key_idx"
  ON "chat_channels" ("direct_key")
  WHERE "direct_key" IS NOT NULL;
