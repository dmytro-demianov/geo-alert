package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server    ServerConfig
	DB        DBConfig
	Auth      AuthConfig
	Firebase  FirebaseConfig
	RateLimit RateLimitConfig
}

type ServerConfig struct {
	Port string
	Env  string
}

type DBConfig struct {
	Host        string
	Port        string
	Name        string
	User        string
	Password    string
	MaxConns    int
}

type AuthConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	JWTSecret          string
	JWTExpiryHours     int
}

type FirebaseConfig struct {
	ProjectID          string
	StorageBucket      string
	ServiceAccountJSON string
}

type RateLimitConfig struct {
	MarkersPerHour  int
	LikesPerHour    int
	CommentsPerHour int
	GlobalPerHour   int
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	maxConns, _ := strconv.Atoi(getEnv("DB_MAX_CONNECTIONS", "20"))
	jwtExpiry, _ := strconv.Atoi(getEnv("AUTH_JWT_EXPIRY_HOURS", "24"))
	markersPerHour, _ := strconv.Atoi(getEnv("RATE_LIMIT_MARKERS_PER_HOUR", "20"))
	likesPerHour, _ := strconv.Atoi(getEnv("RATE_LIMIT_LIKES_PER_HOUR", "100"))
	commentsPerHour, _ := strconv.Atoi(getEnv("RATE_LIMIT_COMMENTS_PER_HOUR", "50"))
	globalPerHour, _ := strconv.Atoi(getEnv("RATE_LIMIT_GLOBAL_PER_HOUR", "1000"))

	cfg := &Config{
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
			Env:  getEnv("SERVER_ENV", "development"),
		},
		DB: DBConfig{
			Host:     requireEnv("DB_HOST"),
			Port:     getEnv("DB_PORT", "5432"),
			Name:     requireEnv("DB_NAME"),
			User:     requireEnv("DB_USER"),
			Password: requireEnv("DB_PASSWORD"),
			MaxConns: maxConns,
		},
		Auth: AuthConfig{
			GoogleClientID:     requireEnv("AUTH_GOOGLE_CLIENT_ID"),
			GoogleClientSecret: requireEnv("AUTH_GOOGLE_CLIENT_SECRET"),
			JWTSecret:          requireEnv("AUTH_JWT_SECRET"),
			JWTExpiryHours:     jwtExpiry,
		},
		Firebase: FirebaseConfig{
			ProjectID:          getEnv("FIREBASE_PROJECT_ID", ""),
			StorageBucket:      getEnv("FIREBASE_STORAGE_BUCKET", ""),
			ServiceAccountJSON: getEnv("FIREBASE_SERVICE_ACCOUNT_JSON", ""),
		},
		RateLimit: RateLimitConfig{
			MarkersPerHour:  markersPerHour,
			LikesPerHour:    likesPerHour,
			CommentsPerHour: commentsPerHour,
			GlobalPerHour:   globalPerHour,
		},
	}

	return cfg, nil
}

func (d *DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s dbname=%s user=%s password=%s sslmode=disable",
		d.Host, d.Port, d.Name, d.User, d.Password,
	)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required env var %s is not set", key))
	}
	return v
}
