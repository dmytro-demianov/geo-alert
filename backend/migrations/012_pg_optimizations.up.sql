-- GIST index for geo queries (replaces non-partial idx_markers_location from 009)
CREATE INDEX IF NOT EXISTS idx_markers_location_gist
    ON markers USING GIST (location);

-- Partial index: active markers only (not deleted), for card feed queries
CREATE INDEX IF NOT EXISTS idx_markers_active
    ON markers (card_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Partial index for TTL-worker: markers with expires_at
CREATE INDEX IF NOT EXISTS idx_markers_expires_at_partial
    ON markers (expires_at)
    WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

-- Index for cursor pagination by created_at + id
CREATE INDEX IF NOT EXISTS idx_markers_pagination
    ON markers (created_at DESC, id)
    WHERE deleted_at IS NULL;

-- Full-text search index on tsvector
CREATE INDEX IF NOT EXISTS idx_markers_fts
    ON markers USING GIN (to_tsvector('russian', coalesce(title,'') || ' ' || coalesce(description,'')));

-- Partial index for comments by marker_id (active only)
CREATE INDEX IF NOT EXISTS idx_comments_marker_id_partial
    ON comments (marker_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Partial index for notification_cooldowns by marker_id
CREATE INDEX IF NOT EXISTS idx_notif_cooldowns_marker
    ON notification_cooldowns (marker_id);
