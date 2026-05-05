package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"github.com/dmytro-demianov/geo-alert/internal/auth"
	"github.com/dmytro-demianov/geo-alert/internal/config"
	"github.com/dmytro-demianov/geo-alert/internal/handler"
	"github.com/dmytro-demianov/geo-alert/internal/middleware"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/pkg/logger"
	"github.com/dmytro-demianov/geo-alert/pkg/migrator"
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

	authHandler := handler.NewAuthHandler(googleOAuth, jwtSvc, userRepo, tokenRepo)
	cardHandler := handler.NewCardHandler(cardRepo)
	authMW := middleware.AuthRequired(jwtSvc)

	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(requestLogger())

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
		authGroup.POST("/logout", authHandler.Logout)
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
	r.GET("/users/:id/cards", cardHandler.ListByOwner)

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
