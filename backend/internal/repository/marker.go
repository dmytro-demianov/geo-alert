package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type MarkerRepo struct {
	db *gorm.DB
}

func NewMarkerRepo(db *gorm.DB) *MarkerRepo {
	return &MarkerRepo{db: db}
}

func (r *MarkerRepo) Create(m *domain.Marker) error {
	return r.db.Exec(`
		INSERT INTO markers (
			id, card_id, created_by, title, description,
			location, latitude, longitude,
			images, tags, like_weight, comment_count, view_count,
			allow_comments, allow_likes, is_draft, notifications_enabled,
			notification_type, expires_at, expiration_type,
			created_at, updated_at
		) VALUES (
			?, ?, ?, ?, ?,
			ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, ?,
			?, ?, 0, 0, 0,
			?, ?, ?, ?,
			?, ?, ?,
			NOW(), NOW()
		)`,
		m.ID, m.CardID, m.CreatedBy, m.Title, m.Description,
		m.Longitude, m.Latitude, m.Latitude, m.Longitude,
		pq.Array(m.Images), pq.Array(m.Tags),
		m.AllowComments, m.AllowLikes, m.IsDraft, m.NotificationsEnabled,
		string(m.NotificationType), m.ExpiresAt, string(m.ExpirationType),
	).Error
}

func (r *MarkerRepo) FindByID(id uuid.UUID) (*domain.Marker, error) {
	var m domain.Marker
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&m).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &m, err
}

type MarkerFilter struct {
	Q              string
	Tags           []string
	Sort           string // newest|oldest|popular
	Cursor         *time.Time
	IncludeExpired bool
	IncludeDrafts  bool
	Limit          int
}

func (r *MarkerRepo) FindByCardID(cardID uuid.UUID, f MarkerFilter) ([]domain.Marker, error) {
	q := r.db.Where("card_id = ? AND deleted_at IS NULL", cardID)

	if !f.IncludeExpired {
		q = q.Where("expires_at IS NULL OR expires_at > NOW()")
	}
	if !f.IncludeDrafts {
		q = q.Where("is_draft = false")
	}
	if f.Q != "" {
		q = q.Where("(title ILIKE ? OR description ILIKE ?)", "%"+f.Q+"%", "%"+f.Q+"%")
	}
	if len(f.Tags) > 0 {
		q = q.Where("tags && ?", pq.Array(f.Tags))
	}

	switch f.Sort {
	case "oldest":
		q = q.Order("created_at ASC")
		if f.Cursor != nil {
			q = q.Where("created_at > ?", f.Cursor)
		}
	case "popular":
		q = q.Order("like_weight DESC, created_at DESC")
		// popular uses offset-based paging via Limit/caller
	default:
		q = q.Order("created_at DESC")
		if f.Cursor != nil {
			q = q.Where("created_at < ?", f.Cursor)
		}
	}

	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	q = q.Limit(limit)

	var markers []domain.Marker
	err := q.Find(&markers).Error
	return markers, err
}

func (r *MarkerRepo) FindNearby(cardID uuid.UUID, lat, lon float64, radiusMeters int) ([]domain.Marker, error) {
	var markers []domain.Marker
	err := r.db.Raw(`
		SELECT * FROM markers
		WHERE card_id = ? AND deleted_at IS NULL AND is_draft = false
		  AND ST_DWithin(
			location::geography,
			ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
			?
		  )
	`, cardID, lon, lat, radiusMeters).Scan(&markers).Error
	return markers, err
}

func (r *MarkerRepo) Update(m *domain.Marker) error {
	m.UpdatedAt = time.Now()
	return r.db.Model(m).Updates(map[string]interface{}{
		"title":                 m.Title,
		"description":           m.Description,
		"images":                m.Images,
		"tags":                  m.Tags,
		"allow_comments":        m.AllowComments,
		"allow_likes":           m.AllowLikes,
		"is_draft":              m.IsDraft,
		"notifications_enabled": m.NotificationsEnabled,
		"notification_type":     string(m.NotificationType),
		"expires_at":            m.ExpiresAt,
		"expiration_type":       string(m.ExpirationType),
		"updated_at":            m.UpdatedAt,
	}).Error
}

func (r *MarkerRepo) Delete(id uuid.UUID, createdBy uuid.UUID) error {
	result := r.db.Where("id = ? AND created_by = ? AND deleted_at IS NULL", id, createdBy).
		First(&domain.Marker{})
	if result.Error == gorm.ErrRecordNotFound {
		return gorm.ErrRecordNotFound
	}
	if result.Error != nil {
		return result.Error
	}
	now := time.Now()
	return r.db.Model(&domain.Marker{}).
		Where("id = ? AND created_by = ?", id, createdBy).
		Update("deleted_at", now).Error
}

func (r *MarkerRepo) IncrementViewCount(id uuid.UUID) error {
	return r.db.Model(&domain.Marker{}).
		Where("id = ? AND deleted_at IS NULL", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}

func (r *MarkerRepo) IncrementMarkerCount(cardID uuid.UUID) error {
	return r.db.Exec("UPDATE cards SET marker_count = marker_count + 1 WHERE id = ?", cardID).Error
}

func (r *MarkerRepo) DecrementMarkerCount(cardID uuid.UUID) error {
	return r.db.Exec("UPDATE cards SET marker_count = GREATEST(marker_count - 1, 0) WHERE id = ?", cardID).Error
}

