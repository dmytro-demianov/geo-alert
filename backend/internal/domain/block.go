package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type BlockType string

const (
	BlockTypeUser BlockType = "USER_BLOCK"
	BlockTypeCard BlockType = "CARD_BLOCK"
)

type Block struct {
	ID                  uuid.UUID      `gorm:"type:uuid;primaryKey"`
	BlockerID           uuid.UUID      `gorm:"type:uuid;not null;index"`
	BlockedUserID       uuid.UUID      `gorm:"type:uuid;not null;index"`
	BlockType           BlockType      `gorm:"type:block_type;not null;default:'USER_BLOCK'"`
	TargetCardID        *uuid.UUID     `gorm:"type:uuid"`
	BlockedFingerprints pq.StringArray `gorm:"type:text[];not null;default:'{}'"`
	CreatedAt           time.Time
}

func (Block) TableName() string { return "blocked_users" }
