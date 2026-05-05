package repository

import (
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type CommentRepo struct {
	db *gorm.DB
}

func NewCommentRepo(db *gorm.DB) *CommentRepo {
	return &CommentRepo{db: db}
}

type CommentFilter struct {
	Cursor *time.Time
	Limit  int
}

func (r *CommentRepo) FindByMarkerID(markerID uuid.UUID, f CommentFilter) ([]domain.Comment, error) {
	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	q := r.db.Where("marker_id = ? AND deleted_at IS NULL", markerID).
		Order("created_at DESC").
		Limit(limit)

	if f.Cursor != nil {
		q = q.Where("created_at < ?", f.Cursor)
	}

	var comments []domain.Comment
	err := q.Find(&comments).Error
	return comments, err
}

func (r *CommentRepo) Create(c *domain.Comment) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`
			INSERT INTO comments (id, marker_id, user_id, text, mentions, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, NOW(), NOW())
		`, c.ID, c.MarkerID, c.UserID, c.Text, pq.Array(c.Mentions)).Error; err != nil {
			return err
		}
		return tx.Exec(
			"UPDATE markers SET comment_count = comment_count + 1 WHERE id = ?",
			c.MarkerID,
		).Error
	})
}

func (r *CommentRepo) FindByID(id uuid.UUID) (*domain.Comment, error) {
	var c domain.Comment
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&c).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &c, err
}

func (r *CommentRepo) Delete(id uuid.UUID) error {
	var markerID uuid.UUID
	if err := r.db.Raw("SELECT marker_id FROM comments WHERE id = ?", id).Scan(&markerID).Error; err != nil {
		return err
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Model(&domain.Comment{}).
			Where("id = ?", id).
			Update("deleted_at", now).Error; err != nil {
			return err
		}
		return tx.Exec(
			"UPDATE markers SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?",
			markerID,
		).Error
	})
}

// ExtractMentions parses @<UUID> patterns from comment text.
func ExtractMentions(text string) []string {
	var mentions []string
	runes := []rune(text)
	n := len(runes)
	i := 0
	for i < n {
		if runes[i] == '@' {
			start := i + 1
			end := start
			for end < n && end-start < 36 && utf8.ValidRune(runes[end]) {
				// UUID characters: hex digits and hyphens
				r := runes[end]
				if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F') || r == '-' {
					end++
				} else {
					break
				}
			}
			if end-start == 36 {
				candidate := string(runes[start:end])
				if _, err := uuid.Parse(candidate); err == nil {
					mentions = append(mentions, candidate)
				}
			}
			i = end
		} else {
			i++
		}
	}
	return mentions
}
