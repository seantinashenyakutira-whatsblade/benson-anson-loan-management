-- Stage 2.6, Migration 026: Landing page WhatsApp setting
-- Task 1: runtime-editable WhatsApp number for the landing Apply Now handoff.
-- NOTE: settings has no value_type column (see 010_system.sql); value is TEXT.

INSERT INTO settings (key, value, category, description)
VALUES (
  'landing_whatsapp_number',
  '+260776950796',
  'general',
  'WhatsApp number for landing page Apply Now handoff'
)
ON CONFLICT (key) DO NOTHING;