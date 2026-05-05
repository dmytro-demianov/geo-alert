-- GeoSpatial (PostGIS GIST)
CREATE INDEX idx_markers_location ON markers USING GIST (location);

-- Users
CREATE INDEX idx_users_email      ON users (email);
CREATE INDEX idx_users_google_id  ON users (google_id);
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;

-- Cards
CREATE INDEX idx_cards_owner_id   ON cards (owner_id);
CREATE INDEX idx_cards_privacy    ON cards (privacy);
CREATE INDEX idx_cards_deleted_at ON cards (deleted_at) WHERE deleted_at IS NOT NULL;

-- Markers
CREATE INDEX idx_markers_card_id    ON markers (card_id);
CREATE INDEX idx_markers_created_by ON markers (created_by);
CREATE INDEX idx_markers_expires_at ON markers (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_markers_deleted_at ON markers (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_markers_is_draft   ON markers (is_draft);

-- Likes
CREATE INDEX idx_likes_marker_id ON likes (marker_id);
CREATE INDEX idx_likes_user_id   ON likes (user_id);

-- Comments
CREATE INDEX idx_comments_marker_id ON comments (marker_id);
CREATE INDEX idx_comments_user_id   ON comments (user_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_user_id        ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_target_card_id ON subscriptions (target_card_id) WHERE target_card_id IS NOT NULL;
CREATE INDEX idx_subscriptions_target_user_id ON subscriptions (target_user_id) WHERE target_user_id IS NOT NULL;

-- Blocks
CREATE INDEX idx_blocked_users_blocker_id      ON blocked_users (blocker_id);
CREATE INDEX idx_blocked_users_blocked_user_id ON blocked_users (blocked_user_id);

-- Notifications
CREATE INDEX idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX idx_notifications_is_read  ON notifications (user_id, is_read) WHERE is_read = false;

-- Reports
CREATE INDEX idx_reports_marker_id ON reports (marker_id);

-- Rate Limits
CREATE INDEX idx_rate_limits_reset_at ON rate_limits (reset_at);
