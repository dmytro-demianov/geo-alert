package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type BlockRepo struct {
	db *gorm.DB
}

func NewBlockRepo(db *gorm.DB) *BlockRepo {
	return &BlockRepo{db: db}
}

func (r *BlockRepo) Create(b *domain.Block) error {
	return r.db.Create(b).Error
}

func (r *BlockRepo) FindByBlockerAndUser(blockerID, blockedUserID uuid.UUID) (*domain.Block, error) {
	var b domain.Block
	err := r.db.Where(
		"blocker_id = ? AND blocked_user_id = ? AND block_type = ?",
		blockerID, blockedUserID, domain.BlockTypeUser,
	).First(&b).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &b, err
}

func (r *BlockRepo) FindByBlockerAndCard(blockerID, blockedUserID, cardID uuid.UUID) (*domain.Block, error) {
	var b domain.Block
	err := r.db.Where(
		"blocker_id = ? AND blocked_user_id = ? AND target_card_id = ? AND block_type = ?",
		blockerID, blockedUserID, cardID, domain.BlockTypeCard,
	).First(&b).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &b, err
}

func (r *BlockRepo) Delete(id uuid.UUID, blockerID uuid.UUID) error {
	result := r.db.Where("id = ? AND blocker_id = ?", id, blockerID).Delete(&domain.Block{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *BlockRepo) DeleteByBlockerAndCard(blockerID, cardID uuid.UUID) error {
	result := r.db.Where(
		"blocker_id = ? AND target_card_id = ? AND block_type = ?",
		blockerID, cardID, domain.BlockTypeCard,
	).Delete(&domain.Block{})
	return result.Error
}

func (r *BlockRepo) FindByBlocker(blockerID uuid.UUID) ([]domain.Block, error) {
	var blocks []domain.Block
	err := r.db.Where("blocker_id = ?", blockerID).Order("created_at DESC").Find(&blocks).Error
	return blocks, err
}

// IsBlocked checks whether targetID is blocked by blockerID (USER_BLOCK).
func (r *BlockRepo) IsBlocked(blockerID, targetID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&domain.Block{}).
		Where("blocker_id = ? AND blocked_user_id = ? AND block_type = ?",
			blockerID, targetID, domain.BlockTypeUser).
		Count(&count).Error
	return count > 0, err
}

// FindByFingerprint returns all USER_BLOCK entries whose blocked_fingerprints contains fp.
func (r *BlockRepo) FindByFingerprint(fp string) ([]domain.Block, error) {
	var blocks []domain.Block
	err := r.db.Where("? = ANY(blocked_fingerprints) AND block_type = ?", fp, domain.BlockTypeUser).
		Find(&blocks).Error
	return blocks, err
}
