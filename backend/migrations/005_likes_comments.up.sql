CREATE TABLE likes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marker_id   UUID NOT NULL REFERENCES markers(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        like_type NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (marker_id, user_id)
);

CREATE TABLE comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marker_id   UUID NOT NULL REFERENCES markers(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text        VARCHAR(500) NOT NULL,
    mentions    UUID[] NOT NULL DEFAULT '{}',
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
