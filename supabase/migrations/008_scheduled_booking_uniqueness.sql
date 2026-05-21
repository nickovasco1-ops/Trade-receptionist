CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_scheduled_per_lead_idx
  ON bookings(lead_id)
  WHERE lead_id IS NOT NULL AND status = 'scheduled';

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_scheduled_slot_per_client_idx
  ON bookings(client_id, scheduled_at)
  WHERE status = 'scheduled';
