package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

var ErrAlreadyReported = errors.New("already reported")

type ReportRepo struct {
	db *gorm.DB
}

func NewReportRepo(db *gorm.DB) *ReportRepo {
	return &ReportRepo{db: db}
}

func (r *ReportRepo) Create(report *domain.Report) error {
	var count int64
	r.db.Model(&domain.Report{}).
		Where("reporter_id = ? AND marker_id = ?", report.ReporterID, report.MarkerID).
		Count(&count)
	if count > 0 {
		return ErrAlreadyReported
	}
	return r.db.Create(report).Error
}

func (r *ReportRepo) FindByMarkerID(markerID uuid.UUID) ([]domain.Report, error) {
	var reports []domain.Report
	err := r.db.Where("marker_id = ?", markerID).Order("created_at DESC").Find(&reports).Error
	return reports, err
}
