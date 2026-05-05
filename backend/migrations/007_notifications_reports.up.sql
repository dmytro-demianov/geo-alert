CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                notification_event_type NOT NULL,
    related_marker_id   UUID REFERENCES markers(id) ON DELETE SET NULL,
    related_card_id     UUID REFERENCES cards(id) ON DELETE SET NULL,
    related_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    message             VARCHAR(500) NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marker_id   UUID NOT NULL REFERENCES markers(id) ON DELETE CASCADE,
    reason      VARCHAR(500) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
