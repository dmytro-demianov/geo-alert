CREATE TABLE IF NOT EXISTS notification_cooldowns (
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marker_id UUID NOT NULL REFERENCES markers(id) ON DELETE CASCADE,
    last_notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_left_at     TIMESTAMPTZ,
    PRIMARY KEY (user_id, marker_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_cooldowns_user ON notification_cooldowns(user_id);
