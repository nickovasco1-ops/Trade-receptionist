-- Add structured qualification fields missing from the original lead schema.
-- property_type: residential vs. commercial (informs pricing and approach).
-- customer_availability: free-text window caller gave (e.g. "Thursdays after 2pm").
ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'unknown')) NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_availability TEXT NULL;
