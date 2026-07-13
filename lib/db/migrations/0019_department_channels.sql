-- Iteration 5: unique department chat channel per department

CREATE UNIQUE INDEX IF NOT EXISTS "chat_channels_department_unique_idx"
  ON "chat_channels" ("department_id")
  WHERE "type" = 'department' AND "department_id" IS NOT NULL;
