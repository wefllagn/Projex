CREATE TABLE "interactive_consoles" (
  "practice_execution_id" UUID PRIMARY KEY REFERENCES "practice_executions"("practice_execution_id") ON DELETE CASCADE,
  "request_key" UUID NOT NULL UNIQUE,
  "phase" TEXT NOT NULL DEFAULT 'QUEUED',
  "stdout" TEXT NOT NULL DEFAULT '', "stderr" TEXT NOT NULL DEFAULT '', "transcript" TEXT NOT NULL DEFAULT '',
  "exit_code" INTEGER, "inputs" JSONB NOT NULL DEFAULT '[]',
  "input_bytes" INTEGER NOT NULL DEFAULT 0 CHECK ("input_bytes" BETWEEN 0 AND 20000),
  "input_closed" BOOLEAN NOT NULL DEFAULT false, "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
  "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "console_phase" CHECK ("phase" IN ('QUEUED','COMPILING','RUNNING','COMPLETED','COMPILE_ERROR','RUNTIME_ERROR','TIMEOUT','OUTPUT_LIMIT','CANCELLED','EXPIRED','FAILED'))
);
