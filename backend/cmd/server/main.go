package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/dmytro-demianov/geo-alert/internal/auth"
	"github.com/dmytro-demianov/geo-alert/internal/config"
	"github.com/dmytro-demianov/geo-alert/internal/handler"
	"github.com/dmytro-demianov/geo-alert/internal/middleware"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/internal/service"
	"github.com/dmytro-demianov/geo-alert/internal/worker"
	"github.com/dmytro-demianov/geo-alert/internal/ws"
	"github.com/dmytro-demianov/geo-alert/pkg/fcm"
	"github.com/dmytro-demianov/geo-alert/pkg/logger"
	"github.com/dmytro-demianov/geo-alert/pkg/migrator"
	"github.com/dmytro-demianov/geo-alert/pkg/storage"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	logger.Init(cfg.Server.Env)

	db, err := repository.NewDB(&cfg.DB)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}

	if err := migrator.Run(cfg.DB.URL(), "file://migrations"); err != nil {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}

	jwtSvc := auth.NewJWTService(cfg.Auth.JWTSecret)
	googleOAuth := auth.NewGoogleOAuth(cfg.Auth.GoogleClientID, cfg.Auth.GoogleClientSecret)

	userRepo := repository.NewUserRepo(db)
	tokenRepo := repository.NewRefreshTokenRepo(db)
	cardRepo := repository.NewCardRepo(db)
	markerRepo := repository.NewMarkerRepo(db)
	subRepo := repository.NewSubscriptionRepo(db)
	commentRepo := repository.NewCommentRepo(db)
	likeRepo := repository.NewLikeRepo(db)
	blockRepo := repository.NewBlockRepo(db)
	feedRepo := repository.NewFeedRepo(db)
	searchRepo := repository.NewSearchRepo(db)
	locationRepo := repository.NewLocationRepo(db)
	cooldownRepo := repository.NewCooldownRepo(db)

	wsManager := ws.NewManager()

	fcmClient, err := fcm.New(cfg.Firebase.ServiceAccountJSON)
	if err != nil {
		log.Warn().Err(err).Msg("FCM init failed — push notifications disabled")
		fcmClient = nil
	}

	storageClient, err := storage.New(cfg.Firebase.ServiceAccountJSON, cfg.Firebase.StorageBucket)
	if err != nil {
		log.Warn().Err(err).Msg("Firebase Storage init failed — photo upload disabled")
		storageClient = nil
	}

	notifService := service.NewNotificationService(fcmClient, cooldownRepo, userRepo)

	authHandler := handler.NewAuthHandler(googleOAuth, jwtSvc, userRepo, tokenRepo)
	cardHandler := handler.NewCardHandler(cardRepo)
	markerHandler := handler.NewMarkerHandler(markerRepo, cardRepo, storageClient)
	uploadHandler := handler.NewUploadHandler(storageClient)
	subHandler := handler.NewSubscriptionHandler(subRepo, cardRepo)
	commentHandler := handler.NewCommentHandler(commentRepo, markerRepo, cardRepo, wsManager)
	likeHandler := handler.NewLikeHandler(likeRepo, markerRepo, wsManager)
	viewHandler := handler.NewViewHandler(markerRepo)
	userHandler := handler.NewUserHandler(userRepo, cardRepo, tokenRepo)
	blockHandler := handler.NewBlockHandler(blockRepo, cardRepo, subRepo)
	feedHandler := handler.NewFeedHandler(feedRepo)
	searchHandler := handler.NewSearchHandler(searchRepo)
	wsHandler := handler.NewWSHandler(wsManager)
	locationHandler := handler.NewLocationHandler(locationRepo, userRepo, notifService)
	authMW := middleware.AuthRequired(jwtSvc)
	optionalAuthMW := middleware.OptionalAuth(jwtSvc)

	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORS(cfg.Server.CORSAllowedOrigins))
	r.Use(requestLogger())
	r.Use(middleware.RateLimit())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	authGroup := r.Group("/auth")
	{
		authGroup.POST("/google", authHandler.GoogleAuth)
		authGroup.POST("/refresh", authHandler.Refresh)
		authGroup.POST("/logout", optionalAuthMW, authHandler.Logout)
		authGroup.GET("/me", authMW, authHandler.Me)
	}

	cards := r.Group("/cards")
	{
		cards.GET("", cardHandler.ListPublic)
		cards.GET("/:id", cardHandler.GetCard)
		cards.POST("", authMW, cardHandler.CreateCard)
		cards.PUT("/:id", authMW, cardHandler.UpdateCard)
		cards.DELETE("/:id", authMW, cardHandler.DeleteCard)
	}
	r.GET("/users/:id", userHandler.GetUser)
	r.PUT("/users/me", authMW, userHandler.UpdateMe)
	r.DELETE("/users/me", authMW, userHandler.DeleteMe)
	r.POST("/users/me/fcm-token", authMW, userHandler.SaveFCMToken)
	r.GET("/users/:id/cards", optionalAuthMW, cardHandler.ListByOwner)

	markers := r.Group("/markers")
	{
		markers.GET("/:id", optionalAuthMW, markerHandler.GetMarker)
		markers.PUT("/:id", authMW, markerHandler.UpdateMarker)
		markers.DELETE("/:id", authMW, markerHandler.DeleteMarker)
		markers.POST("/:id/views", viewHandler.RecordView)
		markers.POST("/:id/likes", authMW, likeHandler.ToggleLike)
		markers.GET("/:id/comments", commentHandler.ListComments)
		markers.POST("/:id/comments", authMW, commentHandler.CreateComment)
	}

	r.DELETE("/comments/:id", authMW, commentHandler.DeleteComment)

	cardMarkers := r.Group("/cards/:id/markers")
	{
		cardMarkers.GET("", optionalAuthMW, markerHandler.ListMarkers)
		cardMarkers.POST("", authMW, markerHandler.CreateMarker)
	}

	subs := r.Group("/subscriptions")
	{
		subs.POST("", authMW, subHandler.Subscribe)
		subs.DELETE("/:id", authMW, subHandler.Unsubscribe)
	}
	r.GET("/me/subscriptions", authMW, subHandler.ListMySubscriptions)
	r.GET("/feed", authMW, feedHandler.GetFeed)
	r.GET("/feed/nearby", optionalAuthMW, locationHandler.GetNearbyFeed)
	r.POST("/users/me/location", authMW, locationHandler.UpdateLocation)
	r.GET("/ws", authMW, wsHandler.ServeWS)
	r.GET("/ws/stats", wsHandler.Stats)
	r.GET("/search", searchHandler.Search)
	r.POST("/upload/photo", authMW, uploadHandler.UploadPhoto)
	r.GET("/me/blocked", authMW, blockHandler.ListBlocked)

	users := r.Group("/users")
	{
		users.POST("/:id/block", authMW, blockHandler.BlockUser)
		users.DELETE("/:id/block", authMW, blockHandler.UnblockUser)
	}

	cards.POST("/:id/block", authMW, blockHandler.BlockUserOnCard)
	cards.DELETE("/:id/block", authMW, blockHandler.UnblockUserOnCard)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	ttlWorker := worker.NewTTLWorker(markerRepo, storageClient, cfg.TTLWorkerInterval)
	go ttlWorker.Run(ctx)

	fcmCleanup := worker.NewFCMCleanupWorker(userRepo, fcmClient, cfg.FCMCleanupInterval)
	go fcmCleanup.Run(ctx)

	addr := ":" + cfg.Server.Port
	log.Info().Str("addr", addr).Str("env", cfg.Server.Env).Msg("server starting")

	if err := r.Run(addr); err != nil {
		log.Fatal().Err(err).Msg("server stopped")
	}
}

func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Info().
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Int("status", c.Writer.Status()).
			Dur("latency", time.Since(start)).
			Msg("request")
	}
}
