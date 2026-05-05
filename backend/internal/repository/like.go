package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type LikeRepo struct {
	db *gorm.DB
}

func NewLikeRepo(db *gorm.DB) *LikeRepo {
	return &LikeRepo{db: db}
}

// FindByUserAndMarker returns existing like (or nil) for the given user+marker pair.
func (r *LikeRepo) FindByUserAndMarker(userID, markerID uuid.UUID) (*domain.Like, error) {
	var l domain.Like
	err := r.db.Where("user_id = ? AND marker_id = ?", userID, markerID).First(&l).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &l, err
}

// Upsert inserts or updates a like row and atomically recalculates like_weight on
// the markers table.
//
// like_weight = (number of LIKEs) - (number of DISLIKEs)
//
// The whole operation runs inside a single transaction so the weight stays
// consistent even under concurrent requests.
func (r *LikeRepo) Upsert(l *domain.Like) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// INSERT … ON CONFLICT (marker_id, user_id) DO UPDATE type = EXCLUDED.type
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "marker_id"}, {Name: "user_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"type"}),
		}).Create(l).Error; err != nil {
			return err
		}

		// Recalculate like_weight atomically
		return tx.Exec(`
			UPDATE markers
			SET like_weight = (
				SELECT COUNT(*) FILTER (WHERE type = 'LIKE')
				       - COUNT(*) FILTER (WHERE type = 'DISLIKE')
				FROM likes
				WHERE marker_id = ?
			)
			WHERE id = ?
		`, l.MarkerID, l.MarkerID).Error
	})
}

// Delete removes the like row and recalculates like_weight on the markers table.
func (r *LikeRepo) Delete(userID, markerID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND marker_id = ?", userID, markerID).
			Delete(&domain.Like{}).Error; err != nil {
			return err
		}

		return tx.Exec(`
			UPDATE markers
			SET like_weight = (
				SELECT COUNT(*) FILTER (WHERE type = 'LIKE')
				       - COUNT(*) FILTER (WHERE type = 'DISLIKE')
				FROM likes
				WHERE marker_id = ?
			)
			WHERE id = ?
		`, markerID, markerID).Error
	})
}
