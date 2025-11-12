# Analytics Backend

Features:

- API key management (register, get, revoke, regenerate)
- Event ingestion endpoint with API key auth (x-api-key header)
- Aggregation endpoints: event-summary, user-stats
- Redis caching for aggregated endpoints
- Rate limiting on ingestion endpoint
- Swagger docs at /docs
- Docker + docker-compose for easy dev environment

Run locally (dev):

1. copy .env.example to .env and set env vars
2. docker-compose up --build
3. Visit http://localhost:4000/docs for Swagger UI
4. Post events to POST http://localhost:4000/api/analytics/collect with header x-api-key

Notes & architecture decisions:

- Write-heavy event storage uses MongoDB with indexes; if you need extreme scale, consider time-series collections, per-day sharded collections, or an append-only log (Kafka) as ingestion buffer.
- Aggregations use MongoDB pipeline; caching via Redis for frequent queries.
- API keys are UUID-based; replace with HMAC-signed keys if you want stronger security.
- Google onboarding uses google-auth-library to verify Google ID tokens.
- Rate limiting is per-IP; for API-key based rate limiting extend middleware to use Redis counters per API key.

Future enhancements:

- Partitioning / sharding for huge data volumes.
- Background workers to rollup event counts (daily/hourly) to speed aggregation.
- Authz for user-level multi-tenancy and role-based dashboards.
