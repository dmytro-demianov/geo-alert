package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type SearchRepo struct {
	db *gorm.DB
}

func NewSearchRepo(db *gorm.DB) *SearchRepo {
	return &SearchRepo{db: db}
}

type MarkerSearchResult struct {
	domain.Marker
	CardTitle string `gorm:"column:card_title"`
}

// SearchMarkers does fulltext search on markers (title + description) in public cards.
// Optionally filters by tags (any match). Results sorted by like_weight DESC.
func (r *SearchRepo) SearchMarkers(q string, tags []string, limit, offset int) ([]MarkerSearchResult, error) {
	query := r.db.Table("markers m").
		Select("m.*, c.title AS card_title").
		Joins("JOIN cards c ON m.card_id = c.id").
		Where("m.deleted_at IS NULL AND c.deleted_at IS NULL AND c.is_public = true AND m.is_draft = false").
		Where("(m.expires_at IS NULL OR m.expires_at > NOW())")

	if q != "" {
		query = query.Where(
			"(to_tsvector('simple', m.title || ' ' || COALESCE(m.description,'')) @@ plainto_tsquery('simple', ?))",
			q,
		)
	}

	if len(tags) > 0 {
		query = query.Where("m.tags && ?", tagsToArray(tags))
	}

	var results []MarkerSearchResult
	err := query.Order("m.like_weight DESC, m.created_at DESC").
		Limit(limit).Offset(offset).
		Scan(&results).Error
	return results, err
}

func (r *SearchRepo) SearchCards(q string, limit, offset int) ([]domain.Card, error) {
	query := r.db.Where("deleted_at IS NULL AND is_public = true")

	if q != "" {
		query = query.Where(
			"to_tsvector('simple', title || ' ' || COALESCE(description,'')) @@ plainto_tsquery('simple', ?)",
			q,
		)
	}

	var cards []domain.Card
	err := query.Order("subscriber_count DESC, created_at DESC").
		Limit(limit).Offset(offset).
		Find(&cards).Error
	return cards, err
}

type UserSearchResult struct {
	ID          uuid.UUID `gorm:"column:id"`
	DisplayName string    `gorm:"column:display_name"`
	AvatarURL   string    `gorm:"column:avatar_url"`
	Bio         string    `gorm:"column:bio"`
	IsPrivate   bool      `gorm:"column:is_private"`
}

func (r *SearchRepo) SearchUsers(q string, limit, offset int) ([]UserSearchResult, error) {
	query := r.db.Table("users").
		Select("id, display_name, avatar_url, bio, is_private").
		Where("deleted_at IS NULL")

	if q != "" {
		query = query.Where("display_name ILIKE ?", "%"+q+"%")
	}

	var users []UserSearchResult
	err := query.Order("display_name ASC").
		Limit(limit).Offset(offset).
		Scan(&users).Error
	return users, err
}

// tagsToArray converts a string slice to a PostgreSQL array literal for the && operator.
func tagsToArray(tags []string) interface{} {
	return tags
}
