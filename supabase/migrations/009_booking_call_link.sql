ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES calls(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_call_id_idx ON bookings(call_id);
