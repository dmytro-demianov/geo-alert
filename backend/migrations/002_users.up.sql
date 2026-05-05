CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id           VARCHAR(255) NOT NULL UNIQUE,
    email               VARCHAR(255) NOT NULL UNIQUE,
    display_name        VARCHAR(255) NOT NULL,
    avatar_url          TEXT,
    bio                 VARCHAR(150),
    is_private          BOOLEAN NOT NULL DEFAULT false,
    browser_fingerprint VARCHAR(255),
    fcm_token           TEXT,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
