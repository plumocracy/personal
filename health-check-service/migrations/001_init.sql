CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE status AS ENUM (
	'ok',
	'bad'
);

CREATE TABLE IF NOT EXISTS service_checks (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	service TEXT NOT NULL,
	status status NOT NULL DEFAULT 'ok',
	checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sent_emails (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	resend_id TEXT,
	error_msg TEXT,
	sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
