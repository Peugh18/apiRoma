-- Update chat_logs table to support new WhatsApp API features
-- Run this in Supabase SQL Editor

-- Add new columns for enhanced tracking
ALTER TABLE chat_logs 
ADD COLUMN IF NOT EXISTS message_type TEXT,
ADD COLUMN IF NOT EXISTS trace_id TEXT,
ADD COLUMN IF NOT EXISTS external_message_id TEXT,
ADD COLUMN IF NOT EXISTS meta_phone_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT;

-- Create index on trace_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_logs_trace_id ON chat_logs(trace_id);

-- Create index on external_message_id for idempotency checks
CREATE INDEX IF NOT EXISTS idx_chat_logs_external_message_id ON chat_logs(external_message_id);

-- Create index on message_type for filtering
CREATE INDEX IF NOT EXISTS idx_chat_logs_message_type ON chat_logs(message_type);

-- Add comment to document new columns
COMMENT ON COLUMN chat_logs.message_type IS 'Type of message: text, image, interactive_button, interactive_list, template, status';
COMMENT ON COLUMN chat_logs.trace_id IS 'Unique trace ID for request tracking across systems';
COMMENT ON COLUMN chat_logs.external_message_id IS 'External message ID from CRM/Laravel for idempotency';
COMMENT ON COLUMN chat_logs.meta_phone_id IS 'Meta phone number ID used to send the message';
COMMENT ON COLUMN chat_logs.status IS 'Message status: accepted, sent, delivered, read, failed';
