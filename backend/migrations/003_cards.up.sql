CREATE TABLE cards (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    privacy             card_privacy NOT NULL DEFAULT 'PRIVATE',
    allow_contributors  BOOLEAN NOT NULL DEFAULT false,
    radius              INT NOT NULL DEFAULT 200,
    timezone            VARCHAR(100) NOT NULL DEFAULT 'UTC',
    marker_count        INT NOT NULL DEFAULT 0,
    subscriber_count    INT NOT NULL DEFAULT 0,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
