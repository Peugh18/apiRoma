-- Create the chat_logs table to store WhatsApp messages
CREATE TABLE chat_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT UNIQUE,
  sender_phone TEXT NOT NULL,
  message_body TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for the service role (backend API and admin)
CREATE POLICY "Service Role Full Access" 
ON chat_logs 
TO service_role 
USING (true) 
WITH CHECK (true);
