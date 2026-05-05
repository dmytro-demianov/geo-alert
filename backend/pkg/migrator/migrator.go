package migrator

import (
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/rs/zerolog/log"
)

// Run applies all pending up-migrations from the given source directory.
// migrationsPath should be a file:// URI, e.g. "file://migrations"
func Run(databaseURL, migrationsPath string) error {
	m, err := migrate.New(migrationsPath, databaseURL)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Info().Msg("migrations: no changes")
			return nil
		}
		return fmt.Errorf("run migrations: %w", err)
	}

	v, _, _ := m.Version()
	log.Info().Uint("version", v).Msg("migrations applied")
	return nil
}
