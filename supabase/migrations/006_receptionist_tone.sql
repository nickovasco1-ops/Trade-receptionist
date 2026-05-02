-- Receptionist personality tone — used to adjust language style in the AI prompt.
-- Values: 'friendly' | 'professional' | 'efficient'

ALTER TABLE business_config
  ADD COLUMN IF NOT EXISTS receptionist_tone TEXT NOT NULL DEFAULT 'friendly';
