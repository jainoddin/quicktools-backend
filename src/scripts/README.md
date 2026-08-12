# Backend maintenance scripts

These scripts are not part of the production server startup path. Run them only by explicit filename after reviewing their target environment.

- `seed*` and `*-curriculum.json`: development or controlled content seeding.
- `backfill*`, `fix*`, `regenerate*`, `install*`, and `assign*`: one-time migrations/repairs; verify database and R2 targets first.
- `upload*`: R2/media maintenance; requires valid storage credentials.
- `check*`, `contentPipelineSmokeTest`, and `realisticImageSmokeTest`: diagnostics/smoke tests.
- `delete*`, `cleanup*`, `make*`, and credit/plan scripts: potentially destructive account/content maintenance; never run automatically.

Generated images, logs, and output text are ignored by Git. Maintained scripts should eventually move into `scripts/seeds`, `scripts/migrations`, and `scripts/maintenance` in a separately reviewed cleanup so no historical operator workflow is broken.
