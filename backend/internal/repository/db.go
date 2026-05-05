package repository

import (
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/dmytro-demianov/geo-alert/internal/config"
)

func NewDB(cfg *config.DBConfig) (*gorm.DB, error) {
	logLevel := gormlogger.Warn
	if cfg.MaxConns == 0 {
		cfg.MaxConns = 20
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: gormlogger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB: %w", err)
	}

	maxOpen := cfg.MaxConns
	if maxOpen <= 0 {
		maxOpen = 25
	}
	sqlDB.SetMaxOpenConns(maxOpen)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(2 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	log.Info().Str("host", cfg.Host).Str("dbname", cfg.Name).Msg("database connected")
	return db, nil
}
