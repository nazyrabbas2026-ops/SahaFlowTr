# Deployment

Docker Compose is a local development topology, not a production deployment claim. Services: PostgreSQL, Redis, MinIO, storage-init, migration, API, web, worker. Application image builds all workspaces and runs as non-root node. Credentials come from ignored .env. The private bucket is provisioned by storage-init.

Before release: pin reviewed image digests, scan dependencies/images, validate migrations on backup copy, configure managed secrets/TLS, add backup restore drills, readiness probes and observability. Auth, tenant integration and full E2E release gates must pass before exposing customer data.
