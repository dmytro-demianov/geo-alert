package worker

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/pkg/storage"
)

type TTLWorker struct {
	markerRepo *repository.MarkerRepo
	storage    *storage.Client
	interval   time.Duration
}

func NewTTLWorker(markerRepo *repository.MarkerRepo, storageClient *storage.Client, interval time.Duration) *TTLWorker {
	return &TTLWorker{
		markerRepo: markerRepo,
		storage:    storageClient,
		interval:   interval,
	}
}

func (w *TTLWorker) Run(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.cleanup(ctx)
		}
	}
}

func (w *TTLWorker) cleanup(ctx context.Context) {
	markers, err := w.markerRepo.FindExpired(100)
	if err != nil {
		log.Error().Err(err).Msg("ttl worker: failed to find expired markers")
		return
	}
	if len(markers) == 0 {
		return
	}

	ids := make([]uuid.UUID, 0, len(markers))
	for _, m := range markers {
		ids = append(ids, m.ID)

		if w.storage != nil && len(m.Images) > 0 {
			if err := w.storage.DeletePhotos(ctx, m.Images); err != nil {
				log.Warn().Err(err).Str("marker_id", m.ID.String()).Msg("ttl worker: failed to delete photos")
			}
		}
	}

	affected, err := w.markerRepo.SoftDeleteExpired(ids)
	if err != nil {
		log.Error().Err(err).Msg("ttl worker: failed to soft-delete expired markers")
		return
	}

	for _, m := range markers {
		if err := w.markerRepo.DecrementMarkerCount(m.CardID); err != nil {
			log.Warn().Err(err).Str("card_id", m.CardID.String()).Msg("ttl worker: failed to decrement marker count")
		}
	}

	log.Info().Int64("deleted", affected).Msg("ttl worker: expired markers cleaned")
}
