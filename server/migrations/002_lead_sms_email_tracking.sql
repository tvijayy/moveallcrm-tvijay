-- ==============================================
-- Add SMS/Email tracking columns to leads
-- ==============================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_sms_action VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_sms_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_email_action VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_email_at TIMESTAMP;
