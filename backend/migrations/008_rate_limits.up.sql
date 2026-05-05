CREATE TABLE rate_limits (
    key         VARCHAR(255) PRIMARY KEY,   -- формат: "<user_id>:<action>"
    count       INT NOT NULL DEFAULT 1,
    reset_at    TIMESTAMPTZ NOT NULL
);
