-- Transcripts had RLS ENABLED (002_revised_schema.sql) but no SELECT policy was
-- ever created, so the dashboard (which uses the anon key + RLS) received zero
-- transcript rows on every join. Call summaries never appeared on the Calls page.
--
-- This adds a SELECT policy mirroring the calls/leads pattern: an owner can read
-- a transcript if it belongs to a call owned by their client row.
-- The server uses the service-role key and bypasses RLS, so writes are unaffected.

CREATE POLICY "transcripts: owner can read"
  ON transcripts FOR SELECT
  USING (
    call_id IN (
      SELECT c.id
      FROM calls c
      JOIN clients cl ON cl.id = c.client_id
      WHERE cl.owner_email = auth.jwt() ->> 'email'
    )
  );
