ALTER TABLE sent_emails
	ADD COLUMN IF NOT EXISTS service TEXT;

CREATE INDEX IF NOT EXISTS sent_emails_service_sent_at_idx
	ON sent_emails (service, sent_at DESC);
