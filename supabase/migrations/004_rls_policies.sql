-- RLS policies so authenticated users can read their own data.
-- The service-role key (used by the server) bypasses all policies.

-- ── clients ───────────────────────────────────────────────────────────────────

CREATE POLICY "clients: owner can read own row"
  ON clients FOR SELECT
  USING (owner_email = auth.jwt() ->> 'email');

CREATE POLICY "clients: owner can update own row"
  ON clients FOR UPDATE
  USING (owner_email = auth.jwt() ->> 'email');

-- ── business_config ───────────────────────────────────────────────────────────

CREATE POLICY "business_config: owner can read"
  ON business_config FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "business_config: owner can update"
  ON business_config FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- ── calls ─────────────────────────────────────────────────────────────────────

CREATE POLICY "calls: owner can read"
  ON calls FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- ── leads ─────────────────────────────────────────────────────────────────────

CREATE POLICY "leads: owner can read"
  ON leads FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "leads: owner can update"
  ON leads FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_email = auth.jwt() ->> 'email'
    )
  );
