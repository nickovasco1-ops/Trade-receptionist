-- Add own_number to clients
-- Stores the client's existing phone number when they choose to keep it
-- and use carrier call divert to route calls to their assigned Twilio number.
-- NULL = client uses their Twilio number as their advertised business number.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS own_number TEXT;
