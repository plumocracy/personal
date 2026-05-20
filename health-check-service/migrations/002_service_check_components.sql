ALTER TABLE service_checks
	ADD COLUMN IF NOT EXISTS component TEXT,
	ADD COLUMN IF NOT EXISTS check_name TEXT;

CREATE INDEX IF NOT EXISTS service_checks_latest_idx
	ON service_checks (service, component, check_name, checked_at DESC);
