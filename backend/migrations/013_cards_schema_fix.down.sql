ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS privacy             card_privacy NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN IF NOT EXISTS allow_contributors  BOOLEAN      NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS timezone            VARCHAR(100) NOT NULL DEFAULT 'UTC';

UPDATE cards SET privacy = CASE WHEN is_public THEN 'PUBLIC'::card_privacy ELSE 'PRIVATE'::card_privacy END;

ALTER TABLE cards
    DROP COLUMN IF EXISTS is_public,
    DROP COLUMN IF EXISTS ttl_hours,
    DROP COLUMN IF EXISTS view_count;
