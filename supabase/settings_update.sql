-- Create app_settings table
CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  meta_phone_number TEXT,
  meta_phone_id TEXT,
  meta_business_account_id TEXT,
  meta_app_id TEXT,
  meta_access_token TEXT,
  whatsapp_verify_token TEXT,
  -- Ensure only one row exists (id must be 1)
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow full access to service_role
CREATE POLICY "Service Role Full Access on Settings" 
ON app_settings 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Insert initial values (using the token you provided)
INSERT INTO app_settings (
  id, 
  meta_phone_number, 
  meta_phone_id, 
  meta_business_account_id, 
  meta_app_id, 
  meta_access_token, 
  whatsapp_verify_token
) VALUES (
  1,
  '+15556600058',
  '1134614116398339',
  '2501803726946207',
  '543928863790564',
  'EAAHus061leQBRoJOTv4kXyZAoWU6CiTHM4P4qgfBUqBZBftUGZBSGojlVfcuXtKMYw1p0ZBXHqZA4ZA7TSGYuJL1c8tTQ5452hlJvhIAeZChEUSEsK4g0d7oje46uYrrrsLXprrs5stvRwZBlv04rzDZAqSUd4y0tbEvNjZCgdE0198sh8MDZAMpxVuE0cI29SqeU3vZBbQXszg5MVnLgZAQ5ZCau4J5DLycd35lt1sOjyuGdKNIRqsJ5ZB1NmHu8U9ZCLcZABEZAPbhp8HWKCEoJEmkAxjZAx8uzqiUqrlWueRb3cZD',
  'roma_secret_token_2026'
) ON CONFLICT (id) DO UPDATE SET
  meta_access_token = EXCLUDED.meta_access_token;
