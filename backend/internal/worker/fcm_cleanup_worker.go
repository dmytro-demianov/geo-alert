package worker

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/pkg/fcm"
)

type FCMCleanupWorker struct {
	userRepo *repository.UserRepo
	fcm      *fcm.Client
	interval time.Duration
}

func NewFCMCleanupWorker(userRepo *repository.UserRepo, fcmClient *fcm.Client, interval time.Duration) *FCMCleanupWorker {
	return &FCMCleanupWorker{
		userRepo: userRepo,
		fcm:      fcmClient,
		interval: interval,
	}
}

func (w *FCMCleanupWorker) Run(ctx context.Context) {
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

func (w *FCMCleanupWorker) cleanup(ctx context.Context) {
	if w.fcm == nil {
		return
	}

	users, err := w.userRepo.FindWithFCMToken(500)
	if err != nil {
		log.Error().Err(err).Msg("fcm cleanup: failed to load users with fcm tokens")
		return
	}
	if len(users) == 0 {
		return
	}

	tokens := make([]string, 0, len(users))
	for _, u := range users {
		tokens = append(tokens, u.FCMToken)
	}

	invalidTokens, err := w.fcm.SendToTokens(ctx, tokens, "ping", "", map[string]string{"type": "ping"})
	if err != nil {
		log.Error().Err(err).Msg("fcm cleanup: failed to send ping")
		return
	}

	for _, token := range invalidTokens {
		matchedUsers, err := w.userRepo.FindByFCMToken(token)
		if err != nil {
			log.Warn().Err(err).Str("token", token).Msg("fcm cleanup: failed to find user by token")
			continue
		}
		for _, u := range matchedUsers {
			if err := w.userRepo.ClearFCMToken(u.ID); err != nil {
				log.Warn().Err(err).Str("user_id", u.ID.String()).Msg("fcm cleanup: failed to clear token")
			}
		}
	}

	log.Info().Int("invalid", len(invalidTokens)).Msg("fcm cleanup: cleared invalid tokens")
}
