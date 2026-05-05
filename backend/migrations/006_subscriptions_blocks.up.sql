CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_card_id  UUID REFERENCES cards(id) ON DELETE CASCADE,
    target_user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_subscription_target CHECK (
        target_card_id IS NOT NULL OR target_user_id IS NOT NULL
    ),
    UNIQUE (user_id, target_card_id),
    UNIQUE (user_id, target_user_id)
);

CREATE TABLE blocked_users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    block_type          block_type NOT NULL DEFAULT 'USER_BLOCK',
    target_card_id      UUID REFERENCES cards(id) ON DELETE CASCADE,
    blocked_fingerprints TEXT[] NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_block CHECK (blocker_id != blocked_user_id)
);
