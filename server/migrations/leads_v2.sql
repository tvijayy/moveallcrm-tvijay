-- ============================================================
-- Leads V2 Migration
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fbcmldzculgqddmnepxw/sql/new
-- ============================================================

-- 1. Add new columns to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_source        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS preferred_start_time VARCHAR(50),
  ADD COLUMN IF NOT EXISTS move_out_address   TEXT,
  ADD COLUMN IF NOT EXISTS move_in_address    TEXT,
  ADD COLUMN IF NOT EXISTS rough_size         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS heavy_items        TEXT,
  ADD COLUMN IF NOT EXISTS access_issues      TEXT,
  ADD COLUMN IF NOT EXISTS category           VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_sms_action    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_sms_at        TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_email_action  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_email_at      TIMESTAMP;

-- 2. Widen status check to support new values
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'new', 'contacted', 'quoted', 'won', 'lost',
    'discussing_considering', 'email_sent', 'left_vm',
    'new_to_call', 'sms_sent', 'to_be_scheduled',
    'booking_form_sent', 'awaiting_quote',
    'no_ans_sms_sent', 'checkin_sms_sent'
  ));

-- 3. Create dropdown options table (admin-managed)
CREATE TABLE IF NOT EXISTS lead_dropdown_options (
  id          SERIAL PRIMARY KEY,
  field_name  VARCHAR(50) NOT NULL,   -- 'heavy_items' | 'extra_requests' | 'access_issues'
  option_value TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Unique constraint so no duplicates per field
CREATE UNIQUE INDEX IF NOT EXISTS idx_dropdown_options_unique
  ON lead_dropdown_options(field_name, option_value);

-- RLS
ALTER TABLE lead_dropdown_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "service_role_all" ON lead_dropdown_options FOR ALL USING (true);

-- 4. Seed default dropdown options
INSERT INTO lead_dropdown_options (field_name, option_value) VALUES
  -- Heavy Items
  ('heavy_items', 'Piano'),
  ('heavy_items', 'Pool Table'),
  ('heavy_items', 'Fridge'),
  ('heavy_items', 'Washing Machine'),
  ('heavy_items', 'Dryer'),
  ('heavy_items', 'Gym Equipment'),
  ('heavy_items', 'Safe'),
  ('heavy_items', 'Spa / Hot Tub'),
  ('heavy_items', 'Lounge / Sofa'),
  ('heavy_items', 'Chest of Drawers'),
  -- Extra Requests
  ('extra_requests', 'Packing Materials'),
  ('extra_requests', 'Fragile Items'),
  ('extra_requests', 'Storage Required'),
  ('extra_requests', 'Weekend Move'),
  ('extra_requests', 'Interstate'),
  ('extra_requests', 'Pet Transport'),
  ('extra_requests', 'House Cleaning'),
  -- Access Issues
  ('access_issues', 'Stairs only – no lift'),
  ('access_issues', 'Long carry – over 20m'),
  ('access_issues', 'Narrow driveway'),
  ('access_issues', 'High rise – lift access'),
  ('access_issues', 'Parking restrictions'),
  ('access_issues', 'Gate code required'),
  ('access_issues', 'No truck access')
ON CONFLICT DO NOTHING;

-- 5. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dropdown_field ON lead_dropdown_options(field_name);
